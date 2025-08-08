/**
 * 🛡️ Critical Security: Main Security Manager
 * 
 * Coordinates all security systems and provides a unified security interface
 * for the execution engine.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

import { securityManager as moduleBlocker } from './moduleBlocker';
import { environmentBlocker } from './environmentBlocker';
import { TimeoutManager } from './timeoutManager';
import { MemoryMonitor } from './memoryMonitor';

export interface SecurityConfig {
  enableModuleBlocking: boolean;
  enableEnvironmentBlocking: boolean;
  enableTimeoutManagement: boolean;
  enableMemoryMonitoring: boolean;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  strictMode: boolean;
}

export interface SecurityReport {
  executionId: string;
  timestamp: Date;
  safe: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  violations: Array<{
    type: string;
    severity: string;
    description: string;
    module?: string;
  }>;
  memoryUsage: {
    peak: number;
    current: number;
    safe: boolean;
  };
  executionTime: number;
  securityScore: number;
}

export interface SecureExecutionContext {
  executionId: string;
  code: string;
  language: string;
  timeout?: number;
  memoryLimit?: number;
}

export class MainSecurityManager {
  private static instance: MainSecurityManager;
  private timeoutManager: TimeoutManager;
  private memoryMonitor: MemoryMonitor;
  private config: SecurityConfig;
  private initialized: boolean = false;

  private constructor() {
    this.config = {
      enableModuleBlocking: true,
      enableEnvironmentBlocking: true,
      enableTimeoutManagement: true,
      enableMemoryMonitoring: true,
      maxExecutionTime: 30000,      // 30 seconds
      maxMemoryUsage: 128 * 1024 * 1024, // 128MB
      strictMode: true
    };

    this.timeoutManager = new TimeoutManager({
      maxExecutionTime: this.config.maxExecutionTime,
      maxCpuTime: 20000,
      checkInterval: 1000
    });

    this.memoryMonitor = new MemoryMonitor({
      maxHeapSize: this.config.maxMemoryUsage,
      maxRssSize: 256 * 1024 * 1024,
      maxArrayBufferSize: 64 * 1024 * 1024,
      checkInterval: 500
    });
  }

  public static getInstance(): MainSecurityManager {
    if (!MainSecurityManager.instance) {
      MainSecurityManager.instance = new MainSecurityManager();
    }
    return MainSecurityManager.instance;
  }

  /**
   * Initialize all security systems
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️  Security manager already initialized');
      return;
    }

    console.log('🛡️  Initializing comprehensive security systems...');

    try {
      // Initialize module blocking
      if (this.config.enableModuleBlocking) {
        moduleBlocker.initializeSecurity();
        console.log('✅ Module blocking initialized');
      }

      // Initialize environment blocking
      if (this.config.enableEnvironmentBlocking) {
        environmentBlocker.initializeBlocking();
        console.log('✅ Environment blocking initialized');
      }

      // Test security systems
      await this.runSecurityTests();

      this.initialized = true;
      console.log('🏆 All security systems initialized successfully');

    } catch (error) {
      console.error('💥 Failed to initialize security systems:', error);
      throw new Error(`Security initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute code within a secure context
   */
  public async executeSecurely<T>(
    context: SecureExecutionContext,
    executor: () => Promise<T>
  ): Promise<{
    result?: T;
    securityReport: SecurityReport;
    success: boolean;
    error?: string;
  }> {
    
    if (!this.initialized) {
      throw new Error('Security manager not initialized');
    }

    const { executionId, code, timeout, memoryLimit } = context;
    const startTime = Date.now();

    // Pre-execution security analysis
    const codeAnalysis = moduleBlocker.analyzeCode(code);
    if (!codeAnalysis.safe && this.config.strictMode) {
      return {
        securityReport: this.createSecurityReport(executionId, codeAnalysis.violations, startTime),
        success: false,
        error: 'Code failed security analysis - contains dangerous patterns'
      };
    }

    // Start monitoring systems
    const memoryMetrics = this.config.enableMemoryMonitoring ? 
      (() => { this.memoryMonitor.startMonitoring(); return this.memoryMonitor.getCurrentMemoryUsage(); })() :
      null;

    let timeoutMetrics;
    if (this.config.enableTimeoutManagement) {
      timeoutMetrics = this.timeoutManager.startExecution(executionId);
    }

    try {
      // Execute with security monitoring
      const executionResult = this.config.enableTimeoutManagement ?
        await this.timeoutManager.executeWithTimeout(
          executionId,
          executor,
          timeout || this.config.maxExecutionTime
        ) :
        { result: await executor(), success: true, metrics: null };

      // Stop monitoring
      const finalMemoryMetrics = this.config.enableMemoryMonitoring ?
        this.memoryMonitor.stopMonitoring() :
        null;

      if (this.config.enableTimeoutManagement) {
        this.timeoutManager.stopExecution(executionId);
      }

      // Create security report
      const securityReport = this.createSecurityReport(
        executionId,
        codeAnalysis.violations,
        startTime,
        finalMemoryMetrics,
        executionResult.metrics
      );

      return {
        result: executionResult.result,
        securityReport,
        success: executionResult.success,
        error: 'error' in executionResult ? executionResult.error : undefined
      };

    } catch (error) {
      // Emergency cleanup
      this.emergencyCleanup(executionId);

      const securityReport = this.createSecurityReport(
        executionId,
        codeAnalysis.violations,
        startTime
      );

      return {
        securityReport,
        success: false,
        error: error instanceof Error ? error.message : 'Security execution failed'
      };
    }
  }

  /**
   * Create comprehensive security report
   */
  private createSecurityReport(
    executionId: string,
    codeViolations: any[],
    startTime: number,
    memoryMetrics?: any,
    timeoutMetrics?: any
  ): SecurityReport {
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Collect all violations
    const allViolations = [
      ...codeViolations.map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description,
        module: v.module
      })),
      ...moduleBlocker.getViolations().map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description,
        module: v.module
      })),
      ...environmentBlocker.getViolations().map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description
      }))
    ];

    // Calculate risk level
    const criticalCount = allViolations.filter(v => v.severity === 'CRITICAL').length;
    const highCount = allViolations.filter(v => v.severity === 'HIGH').length;
    const mediumCount = allViolations.filter(v => v.severity === 'MEDIUM').length;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (criticalCount > 0) riskLevel = 'CRITICAL';
    else if (highCount > 2) riskLevel = 'HIGH';
    else if (highCount > 0 || mediumCount > 3) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Calculate security score (0-100)
    let securityScore = 100;
    securityScore -= criticalCount * 50;
    securityScore -= highCount * 20;
    securityScore -= mediumCount * 10;
    securityScore = Math.max(0, securityScore);

    return {
      executionId,
      timestamp: new Date(),
      safe: criticalCount === 0 && highCount === 0,
      riskLevel,
      violations: allViolations,
      memoryUsage: {
        peak: memoryMetrics?.peakHeapUsed || 0,
        current: memoryMetrics?.heapUsed || 0,
        safe: this.memoryMonitor.isMemoryUsageSafe()
      },
      executionTime,
      securityScore
    };
  }

  /**
   * Emergency cleanup for failed executions
   */
  private emergencyCleanup(executionId: string): void {
    console.log(`🚨 Emergency cleanup for execution ${executionId}`);
    
    try {
      // Stop timeout manager
      this.timeoutManager.terminateExecution(executionId, 'EMERGENCY_CLEANUP');
      
      // Stop memory monitoring
      if (this.memoryMonitor) {
        this.memoryMonitor.stopMonitoring();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }
  }

  /**
   * Run comprehensive security tests
   */
  private async runSecurityTests(): Promise<void> {
    console.log('🧪 Running security validation tests...');

    // Test module blocking
    const moduleTest = moduleBlocker.analyzeCode('require("fs").readFileSync("/etc/passwd")');
    if (moduleTest.safe) {
      throw new Error('Module blocking test failed - dangerous code was marked as safe');
    }

    // Test environment blocking
    const envTest = environmentBlocker.testBlocking();
    if (!envTest.success) {
      throw new Error(`Environment blocking test failed: ${envTest.tests.find(t => !t.passed)?.error}`);
    }

    console.log('✅ Security validation tests passed');
  }

  /**
   * Get comprehensive security status
   */
  public getSecurityStatus(): {
    initialized: boolean;
    config: SecurityConfig;
    systemHealth: {
      moduleBlocking: any;
      environmentBlocking: any;
      memoryMonitoring: any;
      timeoutManagement: any;
    };
  } {
    return {
      initialized: this.initialized,
      config: { ...this.config },
      systemHealth: {
        moduleBlocking: moduleBlocker.getSecurityReport(),
        environmentBlocking: environmentBlocker.getSecurityReport(),
        memoryMonitoring: this.memoryMonitor.getHealthReport(),
        timeoutManagement: this.timeoutManager.healthCheck()
      }
    };
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update subsystem configurations
    if (newConfig.maxExecutionTime || newConfig.maxMemoryUsage) {
      this.timeoutManager.updateConfig({
        maxExecutionTime: this.config.maxExecutionTime,
        maxCpuTime: this.config.maxExecutionTime * 0.8
      });

      this.memoryMonitor.updateLimits({
        maxHeapSize: this.config.maxMemoryUsage
      });
    }

    console.log('🔧 Security configuration updated', this.config);
  }

  /**
   * Shutdown all security systems gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down security systems...');
    
    // Terminate all active executions
    this.timeoutManager.terminateAllExecutions('SYSTEM_SHUTDOWN');
    
    // Stop memory monitoring
    this.memoryMonitor.stopMonitoring();
    
    this.initialized = false;
    console.log('✅ Security systems shutdown complete');
  }
}

// Export singleton instance
export const mainSecurityManager = MainSecurityManager.getInstance();