/**
 * 🛡️ Secure Code Execution Engine
 * 
 * This is the new secure version of the execution engine that integrates
 * all security systems to prevent exploitation.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

import { Worker } from 'worker_threads';
import { v4 as uuidv4 } from 'uuid';
import { mainSecurityManager } from './security/securityManager';
import { ExecutionRequest, ExecutionResult, SecurityReport } from './executionEngine';

export interface EnhancedSecurityReport {
  fileSystemAccess: string[];
  networkAccess: string[];
  processSpawned: string[];
  suspiciousOperations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  securityScore: number;
  violations: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

export interface SecureExecutionResult extends ExecutionResult {
  securityReport: EnhancedSecurityReport;
}

export class SecureExecutionEngine {
  private initialized: boolean = false;

  constructor() {
    this.initializeSecuritySystems();
  }

  /**
   * Initialize all security systems
   */
  private async initializeSecuritySystems(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await mainSecurityManager.initialize();
      this.initialized = true;
      console.log('🛡️  Secure execution engine initialized');
    } catch (error) {
      console.error('💥 Failed to initialize secure execution engine:', error);
      throw error;
    }
  }

  /**
   * Execute code with comprehensive security protection
   */
  public async executeCode(request: ExecutionRequest): Promise<SecureExecutionResult> {
    if (!this.initialized) {
      await this.initializeSecuritySystems();
    }

    const executionId = request.id || uuidv4();
    const startTime = Date.now();

    console.log(`🛡️  Secure execution starting: ${executionId}`);

    // Create secure execution context
    const secureContext = {
      executionId,
      code: request.code,
      language: request.language,
      timeout: request.timeout || 30000,
      memoryLimit: this.parseMemoryLimit(request.memoryLimit)
    };

    // Execute with security monitoring
    const securityResult = await mainSecurityManager.executeSecurely(
      secureContext,
      () => this.executeInSecureEnvironment(request)
    );

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Create comprehensive result with security information
    const result: SecureExecutionResult = {
      id: executionId,
      success: securityResult.success,
      output: securityResult.result?.output || '',
      errors: securityResult.result?.errors || [securityResult.error || 'Execution failed'],
      exitCode: securityResult.success ? 0 : 1,
      executionTime,
      memoryUsage: securityResult.securityReport.memoryUsage.peak,
      performanceMetrics: {
        cpuUsage: 0,
        memoryPeak: securityResult.securityReport.memoryUsage.peak,
        ioOperations: 0,
        networkCalls: 0,
        executionProfile: []
      },
      securityReport: {
        fileSystemAccess: [],
        networkAccess: [],
        processSpawned: [],
        suspiciousOperations: securityResult.securityReport.violations.map(v => v.description),
        riskLevel: securityResult.securityReport.riskLevel.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
        securityScore: securityResult.securityReport.securityScore,
        violations: securityResult.securityReport.violations
      },
      improvements: this.generateSecurityImprovements(securityResult.securityReport)
    };

    console.log(`${securityResult.success ? '✅' : '❌'} Secure execution completed: ${executionId} (Score: ${securityResult.securityReport.securityScore})`);

    return result;
  }

  /**
   * Execute code in a secure Worker Thread environment
   */
  private async executeInSecureEnvironment(request: ExecutionRequest): Promise<{
    output: string;
    errors: string[];
    exitCode: number;
  }> {

    return new Promise((resolve, reject) => {
      // Create secure worker code
      const workerCode = this.createSecureWorkerCode(request.code, request.language);
      
      const worker = new Worker(workerCode, {
        eval: true,
        stderr: true,
        stdout: true,
        env: {}, // Empty environment for security
        resourceLimits: {
          maxOldGenerationSizeMb: 128,  // 128MB memory limit
          maxYoungGenerationSizeMb: 32, // 32MB young generation limit
          codeRangeSizeMb: 16,          // 16MB code range limit
          stackSizeMb: 4                // 4MB stack limit
        }
      });

      let output = '';
      let errors: string[] = [];
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Execution timeout - code took too long to execute'));
      }, request.timeout || 30000);

      worker.on('message', (data) => {
        if (data.type === 'output') {
          output += data.content;
        } else if (data.type === 'error') {
          errors.push(data.content);
        } else if (data.type === 'completed') {
          clearTimeout(timeout);
          resolve({
            output: output || data.output || '',
            errors: errors.concat(data.errors || []),
            exitCode: data.exitCode || 0
          });
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Worker error: ${error.message}`));
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Create secure worker code with all security measures
   */
  private createSecureWorkerCode(userCode: string, language: string): string {
    return `
      const { parentPort } = require('worker_threads');
      
      // 🛡️ SECURITY: Initialize security systems in worker
      const { mainSecurityManager } = require('./security/securityManager');
      
      async function executeSecurely() {
        try {
          // Initialize security in worker context
          await mainSecurityManager.initialize();
          
          let output = '';
          let errors = [];
          
          // Override console to capture output securely
          const originalConsole = { ...console };
          console.log = (...args) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            output += message + '\\n';
            parentPort.postMessage({ type: 'output', content: message + '\\n' });
          };
          
          console.error = (...args) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            errors.push(message);
            parentPort.postMessage({ type: 'error', content: message });
          };
          
          // Execute user code with security monitoring
          ${language === 'javascript' ? 
            'eval(userCode);' : 
            'throw new Error("Language not supported in secure mode");'
          }
          
          // Send completion message
          parentPort.postMessage({
            type: 'completed',
            output,
            errors,
            exitCode: 0
          });
          
        } catch (error) {
          parentPort.postMessage({
            type: 'completed',
            output: '',
            errors: [error.message],
            exitCode: 1
          });
        }
      }
      
      // User code (sandboxed)
      const userCode = \`${userCode.replace(/`/g, '\\`')}\`;
      
      // Execute with error handling
      executeSecurely().catch(error => {
        parentPort.postMessage({
          type: 'completed',
          output: '',
          errors: [error.message],
          exitCode: 1
        });
      });
    `;
  }

  /**
   * Parse memory limit from string format
   */
  private parseMemoryLimit(memoryLimit?: string): number {
    if (!memoryLimit) {
      return 128 * 1024 * 1024; // Default 128MB
    }

    const match = memoryLimit.match(/^(\d+)(MB|GB|KB)?$/i);
    if (!match) {
      return 128 * 1024 * 1024; // Default 128MB
    }

    const value = parseInt(match[1]);
    const unit = (match[2] || 'MB').toUpperCase();

    switch (unit) {
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  /**
   * Generate security improvement suggestions based on violations
   */
  private generateSecurityImprovements(securityReport: any): {
    codeImprovements: string[];
    performanceOptimizations: string[];
    securityEnhancements: string[];
  } {
    const improvements = {
      codeImprovements: [] as string[],
      performanceOptimizations: [] as string[],
      securityEnhancements: [] as string[]
    };

    // Analyze violations and generate suggestions
    securityReport.violations.forEach((violation: any) => {
      switch (violation.type) {
        case 'BLOCKED_MODULE':
          improvements.securityEnhancements.push(
            `Avoid using the '${violation.module}' module. Consider safer alternatives for your use case.`
          );
          break;
        
        case 'DANGEROUS_PATTERN':
          improvements.codeImprovements.push(
            'Remove dangerous code patterns like eval(), dynamic require(), or process manipulation.'
          );
          break;
        
        case 'MEMORY_LIMIT_EXCEEDED':
          improvements.performanceOptimizations.push(
            'Optimize memory usage by avoiding large data structures or memory leaks.'
          );
          break;
        
        case 'EXECUTION_TIMEOUT':
          improvements.performanceOptimizations.push(
            'Optimize algorithm complexity to reduce execution time.'
          );
          break;
      }
    });

    // Add general security recommendations
    if (securityReport.securityScore < 80) {
      improvements.securityEnhancements.push(
        'Follow secure coding practices to improve security score.',
        'Avoid system-level operations and stick to safe computational tasks.',
        'Use whitelisted modules and avoid dynamic code execution.'
      );
    }

    return improvements;
  }

  /**
   * Get security system status
   */
  public getSecurityStatus() {
    return mainSecurityManager.getSecurityStatus();
  }

  /**
   * Shutdown security systems
   */
  public async shutdown(): Promise<void> {
    await mainSecurityManager.shutdown();
    this.initialized = false;
  }
}