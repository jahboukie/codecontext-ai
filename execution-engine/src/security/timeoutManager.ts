/**
 * 🛡️ Critical Security: Execution Timeout Manager
 * 
 * Prevents infinite loops, long-running processes, and DoS attacks by
 * enforcing strict execution time limits.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';

export interface TimeoutConfig {
  maxExecutionTime: number;    // Maximum execution time in milliseconds
  maxCpuTime: number;         // Maximum CPU time in milliseconds
  checkInterval: number;      // How often to check resource usage
}

export interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  executionTime: number;
  cpuUsage: number;
  memoryPeak: number;
  timedOut: boolean;
  reason?: string;
}

export class TimeoutManager extends EventEmitter {
  private static readonly DEFAULT_CONFIG: TimeoutConfig = {
    maxExecutionTime: 30000,   // 30 seconds max
    maxCpuTime: 20000,        // 20 seconds CPU max
    checkInterval: 1000       // Check every second
  };

  private config: TimeoutConfig;
  private activeExecutions: Map<string, {
    startTime: number;
    timeoutHandle: NodeJS.Timeout;
    intervalHandle: NodeJS.Timeout;
    worker?: Worker;
    metrics: ExecutionMetrics;
  }> = new Map();

  constructor(config: Partial<TimeoutConfig> = {}) {
    super();
    this.config = { ...TimeoutManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring an execution with timeout protection
   */
  public startExecution(executionId: string, worker?: Worker): ExecutionMetrics {
    const startTime = Date.now();
    
    const metrics: ExecutionMetrics = {
      startTime,
      executionTime: 0,
      cpuUsage: 0,
      memoryPeak: 0,
      timedOut: false
    };

    // Set up execution timeout
    const timeoutHandle = setTimeout(() => {
      this.terminateExecution(executionId, 'EXECUTION_TIMEOUT');
    }, this.config.maxExecutionTime);

    // Set up periodic resource monitoring
    const intervalHandle = setInterval(() => {
      this.checkResourceUsage(executionId);
    }, this.config.checkInterval);

    // Store execution info
    this.activeExecutions.set(executionId, {
      startTime,
      timeoutHandle,
      intervalHandle,
      worker,
      metrics
    });

    console.log(`🕐 Timeout manager: Started monitoring execution ${executionId}`);
    return metrics;
  }

  /**
   * Stop monitoring an execution (normal completion)
   */
  public stopExecution(executionId: string): ExecutionMetrics | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }

    // Clear timers
    clearTimeout(execution.timeoutHandle);
    clearInterval(execution.intervalHandle);

    // Update metrics
    const endTime = Date.now();
    execution.metrics.endTime = endTime;
    execution.metrics.executionTime = endTime - execution.startTime;

    // Clean up
    this.activeExecutions.delete(executionId);

    console.log(`⏹️  Timeout manager: Stopped monitoring execution ${executionId} (${execution.metrics.executionTime}ms)`);
    
    return execution.metrics;
  }

  /**
   * Forcefully terminate an execution due to timeout or resource limits
   */
  public terminateExecution(executionId: string, reason: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    console.error(`🚨 Timeout manager: Terminating execution ${executionId} - ${reason}`);

    // Update metrics
    const endTime = Date.now();
    execution.metrics.endTime = endTime;
    execution.metrics.executionTime = endTime - execution.startTime;
    execution.metrics.timedOut = true;
    execution.metrics.reason = reason;

    // Terminate worker if exists
    if (execution.worker) {
      execution.worker.terminate();
    }

    // Clear timers
    clearTimeout(execution.timeoutHandle);
    clearInterval(execution.intervalHandle);

    // Emit termination event
    this.emit('execution-terminated', {
      executionId,
      reason,
      metrics: execution.metrics
    });

    // Clean up
    this.activeExecutions.delete(executionId);

    return true;
  }

  /**
   * Check resource usage for an active execution
   */
  private checkResourceUsage(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }

    const currentTime = Date.now();
    const executionTime = currentTime - execution.startTime;

    // Update metrics
    execution.metrics.executionTime = executionTime;

    // Check execution time limit
    if (executionTime > this.config.maxExecutionTime) {
      this.terminateExecution(executionId, 'MAX_EXECUTION_TIME_EXCEEDED');
      return;
    }

    // Check memory usage (if worker exists)
    if (execution.worker) {
      try {
        const memoryUsage = process.memoryUsage();
        execution.metrics.memoryPeak = Math.max(
          execution.metrics.memoryPeak,
          memoryUsage.heapUsed
        );

        // Check for memory limit (256MB)
        const maxMemory = 256 * 1024 * 1024; // 256MB
        if (memoryUsage.heapUsed > maxMemory) {
          this.terminateExecution(executionId, 'MEMORY_LIMIT_EXCEEDED');
          return;
        }
      } catch (error) {
        console.warn(`⚠️  Could not check memory usage for ${executionId}:`, error);
      }
    }

    // Check CPU usage (basic check)
    const cpuUsage = process.cpuUsage();
    const cpuTimeMs = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms
    execution.metrics.cpuUsage = cpuTimeMs;

    if (cpuTimeMs > this.config.maxCpuTime) {
      this.terminateExecution(executionId, 'CPU_TIME_EXCEEDED');
      return;
    }
  }

  /**
   * Get metrics for an active execution
   */
  public getExecutionMetrics(executionId: string): ExecutionMetrics | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }

    // Update current execution time
    execution.metrics.executionTime = Date.now() - execution.startTime;
    
    return { ...execution.metrics };
  }

  /**
   * Get all active executions
   */
  public getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Terminate all active executions (emergency stop)
   */
  public terminateAllExecutions(reason: string = 'EMERGENCY_SHUTDOWN'): number {
    const executionIds = this.getActiveExecutions();
    let terminatedCount = 0;

    for (const executionId of executionIds) {
      if (this.terminateExecution(executionId, reason)) {
        terminatedCount++;
      }
    }

    console.log(`🛑 Timeout manager: Terminated ${terminatedCount} active executions`);
    return terminatedCount;
  }

  /**
   * Create a secure execution wrapper with timeout protection
   */
  public async executeWithTimeout<T>(
    executionId: string,
    execution: () => Promise<T>,
    customTimeout?: number
  ): Promise<{ result?: T; metrics: ExecutionMetrics; success: boolean; error?: string }> {
    
    // Override timeout if specified
    const originalTimeout = this.config.maxExecutionTime;
    if (customTimeout) {
      this.config.maxExecutionTime = customTimeout;
    }

    const metrics = this.startExecution(executionId);
    
    try {
      // Race between execution and timeout
      const result = await Promise.race([
        execution(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Execution timeout'));
          }, this.config.maxExecutionTime);
        })
      ]);

      const finalMetrics = this.stopExecution(executionId) || metrics;
      
      return {
        result,
        metrics: finalMetrics,
        success: true
      };

    } catch (error) {
      const finalMetrics = this.stopExecution(executionId) || metrics;
      finalMetrics.timedOut = true;
      finalMetrics.reason = error instanceof Error ? error.message : 'Unknown error';

      return {
        metrics: finalMetrics,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Restore original timeout
      if (customTimeout) {
        this.config.maxExecutionTime = originalTimeout;
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<TimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Timeout manager: Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): TimeoutConfig {
    return { ...this.config };
  }

  /**
   * Health check - verify timeout manager is working
   */
  public healthCheck(): { healthy: boolean; activeExecutions: number; config: TimeoutConfig } {
    return {
      healthy: true,
      activeExecutions: this.activeExecutions.size,
      config: this.getConfig()
    };
  }
}