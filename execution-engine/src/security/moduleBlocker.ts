/**
 * 🛡️ Critical Security: Module Access Blocker
 * 
 * This module blocks access to dangerous Node.js modules that could be used
 * for system access, file manipulation, network requests, or process spawning.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

import { createHash } from 'crypto';

export interface SecurityViolation {
  type: 'BLOCKED_MODULE' | 'DANGEROUS_PATTERN' | 'SUSPICIOUS_BEHAVIOR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  module?: string;
  pattern?: string;
  description: string;
  timestamp: Date;
  codeHash?: string;
}

export class ModuleSecurityManager {
  private static instance: ModuleSecurityManager;
  private violations: SecurityViolation[] = [];
  
  // 🚨 CRITICAL: These modules provide dangerous system access
  private readonly BLOCKED_MODULES = new Set([
    // File system access
    'fs', 'fs/promises', 'fs-extra', 'graceful-fs',
    
    // Process and system access
    'child_process', 'cluster', 'process', 'os',
    
    // Network access
    'net', 'http', 'https', 'http2', 'dgram', 'dns', 'tls',
    
    // System and native modules
    'vm', 'worker_threads', 'async_hooks', 'inspector',
    'perf_hooks', 'trace_events', 'v8', 'repl',
    
    // External package managers
    'npm', 'yarn', 'pnpm',
    
    // Database connections
    'mysql', 'mysql2', 'pg', 'mongodb', 'redis', 'sqlite3',
    
    // Dangerous third-party modules
    'shelljs', 'node-cmd', 'exec', 'spawn-sync'
  ]);

  // ✅ SAFE: These modules are allowed with limited functionality
  private readonly ALLOWED_MODULES = new Set([
    'crypto', 'util', 'events', 'stream', 'buffer',
    'string_decoder', 'querystring', 'url', 'path',
    'assert', 'constants', 'timers', 'console'
  ]);

  // 🔍 SUSPICIOUS: Patterns that indicate potential security risks
  private readonly DANGEROUS_PATTERNS = [
    /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
    /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
    /require\s*\(\s*['"`]net['"`]\s*\)/gi,
    /require\s*\(\s*['"`]http['"`]\s*\)/gi,
    /require\s*\(\s*['"`]os['"`]\s*\)/gi,
    /process\.(exit|kill|abort)/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout.*eval/gi,
    /setInterval.*eval/gi,
    /global\./gi,
    /globalThis\./gi
  ];

  private constructor() {}

  public static getInstance(): ModuleSecurityManager {
    if (!ModuleSecurityManager.instance) {
      ModuleSecurityManager.instance = new ModuleSecurityManager();
    }
    return ModuleSecurityManager.instance;
  }

  /**
   * Initialize the security manager and override the global require function
   */
  public initializeSecurity(): void {
    this.overrideGlobalRequire();
    this.blockDangerousGlobals();
    this.setupProcessRestrictions();
    console.log('🛡️  Module security manager initialized');
  }

  /**
   * Override the global require function to block dangerous modules
   */
  private overrideGlobalRequire(): void {
    const originalRequire = global.require || require;
    
    // Create secure require function
    const secureRequire = (id: string) => {
      // Check if module is explicitly blocked
      if (this.BLOCKED_MODULES.has(id)) {
        const violation: SecurityViolation = {
          type: 'BLOCKED_MODULE',
          severity: 'CRITICAL',
          module: id,
          description: `Attempt to require blocked module: ${id}`,
          timestamp: new Date()
        };
        this.violations.push(violation);
        throw new Error(`🚨 SECURITY: Module '${id}' is blocked for security reasons`);
      }

      // If it's an allowed module, provide limited functionality
      if (this.ALLOWED_MODULES.has(id)) {
        return this.createSecureModuleProxy(id, originalRequire(id));
      }

      // Block all other modules by default
      const violation: SecurityViolation = {
        type: 'BLOCKED_MODULE',
        severity: 'HIGH',
        module: id,
        description: `Attempt to require unknown/restricted module: ${id}`,
        timestamp: new Date()
      };
      this.violations.push(violation);
      throw new Error(`🚨 SECURITY: Module '${id}' is not whitelisted`);
    };

    // Replace global require
    global.require = secureRequire as any;
    
    // Also override module.require if it exists
    if (typeof module !== 'undefined' && module.require) {
      module.require = secureRequire as any;
    }
  }

  /**
   * Create a secure proxy for allowed modules with limited functionality
   */
  private createSecureModuleProxy(moduleName: string, originalModule: any): any {
    switch (moduleName) {
      case 'crypto':
        return {
          // Allow basic crypto operations only
          randomBytes: originalModule.randomBytes,
          createHash: originalModule.createHash,
          createHmac: originalModule.createHmac,
          timingSafeEqual: originalModule.timingSafeEqual,
          // Block dangerous crypto functions
          // createCipher, createDecipher, etc. are excluded
        };

      case 'util':
        return {
          format: originalModule.format,
          inspect: originalModule.inspect,
          isArray: originalModule.isArray,
          isDate: originalModule.isDate,
          isError: originalModule.isError,
          // Block util.promisify for dangerous functions
        };

      case 'path':
        return {
          join: originalModule.join,
          resolve: originalModule.resolve,
          basename: originalModule.basename,
          dirname: originalModule.dirname,
          extname: originalModule.extname,
          parse: originalModule.parse,
          format: originalModule.format,
          sep: originalModule.sep
        };

      default:
        // For other allowed modules, return as-is but log usage
        console.log(`ℹ️  Module '${moduleName}' accessed (monitored)`);
        return originalModule;
    }
  }

  /**
   * Block dangerous global objects and functions
   */
  private blockDangerousGlobals(): void {
    // Block eval and Function constructor
    (global as any).eval = () => {
      throw new Error('🚨 SECURITY: eval() is blocked for security reasons');
    };

    (global as any).Function = () => {
      throw new Error('🚨 SECURITY: Function constructor is blocked for security reasons');
    };

    // Block access to process object
    if (typeof process !== 'undefined') {
      const originalProcess = process;
      (global as any).process = new Proxy({}, {
        get(target, prop) {
          // Allow only safe process properties for application runtime
          const allowedProps = [
            'env', 'version', 'versions', 'platform', 'arch', 'pid',
            'on', 'once', 'removeListener', 'removeAllListeners', // Event handling (needed for graceful shutdown)
            'memoryUsage', 'hrtime', 'nextTick', // Safe runtime methods
            'cwd' // Current working directory (read-only)
          ];
          
          // Block dangerous process methods
          const blockedProps = [
            'exit', 'kill', 'abort', 'chdir', 'umask', 
            'setuid', 'setgid', 'setgroups', 'dlopen'
          ];
          
          if (blockedProps.includes(prop as string)) {
            throw new Error(`🚨 SECURITY: Access to dangerous process.${String(prop)} is blocked`);
          }
          
          if (allowedProps.includes(prop as string)) {
            const value = originalProcess[prop as keyof typeof originalProcess];
            // For event methods, limit the events that can be listened to
            if (prop === 'on' || prop === 'once') {
              return (event: string, listener: Function) => {
                const allowedEvents = ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection'];
                if (!allowedEvents.includes(event)) {
                  throw new Error(`🚨 SECURITY: Listening to process event '${event}' is not allowed`);
                }
                return (value as Function).call(originalProcess, event, listener);
              };
            }
            return value;
          }
          throw new Error(`🚨 SECURITY: Access to process.${String(prop)} is not whitelisted`);
        }
      });
    }
  }

  /**
   * Set up process-level security restrictions
   */
  private setupProcessRestrictions(): void {
    // Override setTimeout and setInterval to prevent eval injection
    const originalSetTimeout = setTimeout;
    const originalSetInterval = setInterval;

    (global as any).setTimeout = (callback: any, ...args: any[]) => {
      if (typeof callback === 'string') {
        throw new Error('🚨 SECURITY: String-based setTimeout is blocked');
      }
      return originalSetTimeout(callback, ...args);
    };

    (global as any).setInterval = (callback: any, ...args: any[]) => {
      if (typeof callback === 'string') {
        throw new Error('🚨 SECURITY: String-based setInterval is blocked');
      }
      return originalSetInterval(callback, ...args);
    };
  }

  /**
   * Analyze code for dangerous patterns before execution
   */
  public analyzeCode(code: string): { safe: boolean; violations: SecurityViolation[] } {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const foundViolations: SecurityViolation[] = [];

    // Check for dangerous patterns
    this.DANGEROUS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(code)) {
        foundViolations.push({
          type: 'DANGEROUS_PATTERN',
          severity: 'HIGH',
          pattern: pattern.toString(),
          description: `Dangerous pattern detected in code`,
          timestamp: new Date(),
          codeHash
        });
      }
    });

    // Check for suspicious behavior indicators
    if (code.length > 50000) { // 50KB limit
      foundViolations.push({
        type: 'SUSPICIOUS_BEHAVIOR',
        severity: 'MEDIUM',
        description: 'Code size exceeds reasonable limits',
        timestamp: new Date(),
        codeHash
      });
    }

    // Add violations to the log
    this.violations.push(...foundViolations);

    return {
      safe: foundViolations.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length === 0,
      violations: foundViolations
    };
  }

  /**
   * Get security violation history
   */
  public getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  /**
   * Clear violation history (use with caution)
   */
  public clearViolations(): void {
    this.violations = [];
  }

  /**
   * Get security status report
   */
  public getSecurityReport(): {
    totalViolations: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    isSecure: boolean;
  } {
    const critical = this.violations.filter(v => v.severity === 'CRITICAL').length;
    const high = this.violations.filter(v => v.severity === 'HIGH').length;
    const medium = this.violations.filter(v => v.severity === 'MEDIUM').length;
    const low = this.violations.filter(v => v.severity === 'LOW').length;

    return {
      totalViolations: this.violations.length,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      isSecure: critical === 0 && high === 0
    };
  }
}

// Initialize security immediately when module is loaded
const securityManager = ModuleSecurityManager.getInstance();

export { securityManager };