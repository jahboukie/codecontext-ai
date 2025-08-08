/**
 * 🛡️ Critical Security: Memory Usage Monitor
 * 
 * Prevents memory exhaustion attacks by monitoring and limiting memory usage
 * during code execution.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

export interface MemoryLimits {
  maxHeapSize: number;        // Maximum heap memory in bytes
  maxRssSize: number;         // Maximum resident set size in bytes
  maxArrayBufferSize: number; // Maximum ArrayBuffer size in bytes
  checkInterval: number;      // Memory check interval in milliseconds
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  peakHeapUsed: number;
  peakRss: number;
  timestamp: number;
}

export interface MemoryViolation {
  type: 'HEAP_LIMIT_EXCEEDED' | 'RSS_LIMIT_EXCEEDED' | 'ARRAY_BUFFER_LIMIT_EXCEEDED' | 'MEMORY_GROWTH_ANOMALY';
  severity: 'HIGH' | 'CRITICAL';
  limit: number;
  actual: number;
  timestamp: number;
  description: string;
}

export class MemoryMonitor {
  private static readonly DEFAULT_LIMITS: MemoryLimits = {
    maxHeapSize: 128 * 1024 * 1024,      // 128MB heap
    maxRssSize: 256 * 1024 * 1024,       // 256MB RSS
    maxArrayBufferSize: 64 * 1024 * 1024, // 64MB ArrayBuffers
    checkInterval: 500                     // Check every 500ms
  };

  private limits: MemoryLimits;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryMetrics[] = [];
  private violations: MemoryViolation[] = [];
  private isMonitoring: boolean = false;
  private peakMetrics: MemoryMetrics;

  constructor(limits: Partial<MemoryLimits> = {}) {
    this.limits = { ...MemoryMonitor.DEFAULT_LIMITS, ...limits };
    this.peakMetrics = this.createEmptyMetrics();
  }

  /**
   * Start memory monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️  Memory monitor: Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.memoryHistory = [];
    this.violations = [];
    this.peakMetrics = this.createEmptyMetrics();

    console.log('🧠 Memory monitor: Started monitoring');

    // Set up periodic memory checks
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.limits.checkInterval);

    // Initial memory check
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): MemoryMetrics {
    if (!this.isMonitoring) {
      console.warn('⚠️  Memory monitor: Not currently monitoring');
      return this.createEmptyMetrics();
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Memory monitor: Stopped monitoring');
    console.log(`📊 Peak memory usage: ${(this.peakMetrics.peakHeapUsed / 1024 / 1024).toFixed(2)}MB heap, ${(this.peakMetrics.peakRss / 1024 / 1024).toFixed(2)}MB RSS`);

    return { ...this.peakMetrics };
  }

  /**
   * Perform memory usage check
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const timestamp = Date.now();

    const metrics: MemoryMetrics = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      peakHeapUsed: Math.max(this.peakMetrics.peakHeapUsed, memoryUsage.heapUsed),
      peakRss: Math.max(this.peakMetrics.peakRss, memoryUsage.rss),
      timestamp
    };

    // Update peak metrics
    this.peakMetrics.peakHeapUsed = metrics.peakHeapUsed;
    this.peakMetrics.peakRss = metrics.peakRss;

    // Add to history (keep last 100 entries)
    this.memoryHistory.push(metrics);
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }

    // Check for limit violations
    this.checkLimits(metrics);

    // Check for memory growth anomalies
    this.checkMemoryGrowthAnomalies(metrics);
  }

  /**
   * Check memory limits and record violations
   */
  private checkLimits(metrics: MemoryMetrics): void {
    // Check heap limit
    if (metrics.heapUsed > this.limits.maxHeapSize) {
      const violation: MemoryViolation = {
        type: 'HEAP_LIMIT_EXCEEDED',
        severity: 'CRITICAL',
        limit: this.limits.maxHeapSize,
        actual: metrics.heapUsed,
        timestamp: metrics.timestamp,
        description: `Heap memory exceeded limit: ${this.formatBytes(metrics.heapUsed)} > ${this.formatBytes(this.limits.maxHeapSize)}`
      };
      this.violations.push(violation);
      this.handleViolation(violation);
    }

    // Check RSS limit
    if (metrics.rss > this.limits.maxRssSize) {
      const violation: MemoryViolation = {
        type: 'RSS_LIMIT_EXCEEDED',
        severity: 'CRITICAL',
        limit: this.limits.maxRssSize,
        actual: metrics.rss,
        timestamp: metrics.timestamp,
        description: `RSS memory exceeded limit: ${this.formatBytes(metrics.rss)} > ${this.formatBytes(this.limits.maxRssSize)}`
      };
      this.violations.push(violation);
      this.handleViolation(violation);
    }

    // Check ArrayBuffer limit
    if (metrics.arrayBuffers > this.limits.maxArrayBufferSize) {
      const violation: MemoryViolation = {
        type: 'ARRAY_BUFFER_LIMIT_EXCEEDED',
        severity: 'HIGH',
        limit: this.limits.maxArrayBufferSize,
        actual: metrics.arrayBuffers,
        timestamp: metrics.timestamp,
        description: `ArrayBuffer memory exceeded limit: ${this.formatBytes(metrics.arrayBuffers)} > ${this.formatBytes(this.limits.maxArrayBufferSize)}`
      };
      this.violations.push(violation);
      this.handleViolation(violation);
    }
  }

  /**
   * Check for suspicious memory growth patterns
   */
  private checkMemoryGrowthAnomalies(metrics: MemoryMetrics): void {
    if (this.memoryHistory.length < 10) {
      return; // Need more data points
    }

    const recentMetrics = this.memoryHistory.slice(-10);
    const oldestRecent = recentMetrics[0];
    const newestRecent = metrics;

    // Check for rapid memory growth (>50MB in 5 seconds)
    const timeDiff = newestRecent.timestamp - oldestRecent.timestamp;
    const heapGrowth = newestRecent.heapUsed - oldestRecent.heapUsed;
    
    if (timeDiff < 5000 && heapGrowth > 50 * 1024 * 1024) { // 50MB growth in 5 seconds
      const violation: MemoryViolation = {
        type: 'MEMORY_GROWTH_ANOMALY',
        severity: 'HIGH',
        limit: 50 * 1024 * 1024,
        actual: heapGrowth,
        timestamp: metrics.timestamp,
        description: `Suspicious rapid memory growth: ${this.formatBytes(heapGrowth)} in ${timeDiff}ms`
      };
      this.violations.push(violation);
      this.handleViolation(violation);
    }
  }

  /**
   * Handle memory limit violation
   */
  private handleViolation(violation: MemoryViolation): void {
    console.error(`🚨 Memory Monitor: ${violation.type} - ${violation.description}`);
    
    if (violation.severity === 'CRITICAL') {
      // Force garbage collection if available
      if (global.gc) {
        console.log('🗑️  Forcing garbage collection due to critical memory violation');
        global.gc();
      }

      // Throw error to stop execution
      throw new Error(`Memory limit exceeded: ${violation.description}`);
    } else if (violation.severity === 'HIGH') {
      // Log warning for high-severity violations
      console.warn(`⚠️  High memory usage warning: ${violation.description}`);
    }
  }

  /**
   * Get current memory usage
   */
  public getCurrentMemoryUsage(): MemoryMetrics {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      peakHeapUsed: this.peakMetrics.peakHeapUsed,
      peakRss: this.peakMetrics.peakRss,
      timestamp: Date.now()
    };
  }

  /**
   * Get peak memory usage during monitoring period
   */
  public getPeakMemoryUsage(): MemoryMetrics {
    return { ...this.peakMetrics };
  }

  /**
   * Get memory usage history
   */
  public getMemoryHistory(): MemoryMetrics[] {
    return [...this.memoryHistory];
  }

  /**
   * Get memory violations
   */
  public getViolations(): MemoryViolation[] {
    return [...this.violations];
  }

  /**
   * Check if memory usage is within safe limits
   */
  public isMemoryUsageSafe(): boolean {
    const current = this.getCurrentMemoryUsage();
    
    return (
      current.heapUsed <= this.limits.maxHeapSize &&
      current.rss <= this.limits.maxRssSize &&
      current.arrayBuffers <= this.limits.maxArrayBufferSize
    );
  }

  /**
   * Get memory health report
   */
  public getHealthReport(): {
    safe: boolean;
    currentUsage: MemoryMetrics;
    peakUsage: MemoryMetrics;
    violations: number;
    heapUtilization: number;
    rssUtilization: number;
  } {
    const current = this.getCurrentMemoryUsage();
    
    return {
      safe: this.isMemoryUsageSafe(),
      currentUsage: current,
      peakUsage: this.getPeakMemoryUsage(),
      violations: this.violations.length,
      heapUtilization: (current.heapUsed / this.limits.maxHeapSize) * 100,
      rssUtilization: (current.rss / this.limits.maxRssSize) * 100
    };
  }

  /**
   * Update memory limits
   */
  public updateLimits(newLimits: Partial<MemoryLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    console.log('🔧 Memory monitor: Limits updated', this.limits);
  }

  /**
   * Clear monitoring data
   */
  public clearHistory(): void {
    this.memoryHistory = [];
    this.violations = [];
    this.peakMetrics = this.createEmptyMetrics();
    console.log('🗑️  Memory monitor: History cleared');
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): MemoryMetrics {
    return {
      heapUsed: 0,
      heapTotal: 0,
      rss: 0,
      external: 0,
      arrayBuffers: 0,
      peakHeapUsed: 0,
      peakRss: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Format bytes for human-readable output
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}