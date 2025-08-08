/**
 * 🛡️ Critical Security: Environment Variable Access Blocker
 * 
 * Prevents access to sensitive environment variables that could contain
 * API keys, database credentials, or other sensitive information.
 * 
 * SECURITY LEVEL: CRITICAL
 * LAST UPDATED: 2025-08-07
 */

export interface EnvironmentViolation {
  type: 'ENV_ACCESS_BLOCKED' | 'SENSITIVE_VAR_ACCESS' | 'ENV_ENUMERATION';
  severity: 'HIGH' | 'CRITICAL';
  variable?: string;
  description: string;
  timestamp: Date;
}

export class EnvironmentBlocker {
  private static instance: EnvironmentBlocker;
  private violations: EnvironmentViolation[] = [];
  
  // 🚨 CRITICAL: These environment variables contain sensitive information
  private readonly SENSITIVE_VARS = new Set([
    // API Keys and Tokens
    'API_KEY', 'API_SECRET', 'API_TOKEN', 'ACCESS_TOKEN', 'SECRET_KEY',
    'JWT_SECRET', 'JWT_KEY', 'OAUTH_SECRET', 'GITHUB_TOKEN', 'SLACK_TOKEN',
    
    // Database Credentials
    'DATABASE_URL', 'DB_PASSWORD', 'DB_USER', 'DB_HOST', 'DB_CONNECTION',
    'MYSQL_PASSWORD', 'POSTGRES_PASSWORD', 'MONGODB_URI', 'REDIS_PASSWORD',
    
    // Cloud Service Credentials
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
    'GOOGLE_APPLICATION_CREDENTIALS', 'AZURE_CLIENT_SECRET', 'FIREBASE_CONFIG',
    
    // Application Secrets
    'SESSION_SECRET', 'ENCRYPTION_KEY', 'PRIVATE_KEY', 'CERTIFICATE',
    'WEBHOOK_SECRET', 'STRIPE_SECRET_KEY', 'TWILIO_AUTH_TOKEN',
    
    // System and Container Info
    'HOME', 'USER', 'USERNAME', 'HOSTNAME', 'PWD', 'PATH',
    'SHELL', 'TERM', 'SSH_AUTH_SOCK', 'SSH_CLIENT', 'SSH_CONNECTION'
  ]);

  // ✅ SAFE: These environment variables are safe to access
  private readonly ALLOWED_VARS = new Set([
    'NODE_ENV', 'NODE_VERSION', 'TZ', 'LANG', 'LC_ALL'
  ]);

  private originalProcessEnv: NodeJS.ProcessEnv;

  private constructor() {
    this.originalProcessEnv = { ...process.env };
  }

  public static getInstance(): EnvironmentBlocker {
    if (!EnvironmentBlocker.instance) {
      EnvironmentBlocker.instance = new EnvironmentBlocker();
    }
    return EnvironmentBlocker.instance;
  }

  /**
   * Initialize environment variable blocking
   */
  public initializeBlocking(): void {
    this.createSecureProcessEnvProxy();
    console.log('🛡️  Environment blocker initialized');
  }

  /**
   * Create a secure proxy for process.env that blocks sensitive variables
   */
  private createSecureProcessEnvProxy(): void {
    const self = this;

    // Create a proxy for process.env
    const secureEnv = new Proxy({}, {
      get(target, prop: string | symbol): any {
        if (typeof prop !== 'string') {
          return undefined;
        }

        // Check if trying to access sensitive variable
        if (self.SENSITIVE_VARS.has(prop.toUpperCase())) {
          const violation: EnvironmentViolation = {
            type: 'SENSITIVE_VAR_ACCESS',
            severity: 'CRITICAL',
            variable: prop,
            description: `Attempt to access sensitive environment variable: ${prop}`,
            timestamp: new Date()
          };
          self.violations.push(violation);
          
          console.error(`🚨 SECURITY: Blocked access to sensitive environment variable: ${prop}`);
          throw new Error(`Access to environment variable '${prop}' is blocked for security reasons`);
        }

        // Allow access to whitelisted variables
        if (self.ALLOWED_VARS.has(prop.toUpperCase())) {
          return self.originalProcessEnv[prop];
        }

        // Block all other variables
        const violation: EnvironmentViolation = {
          type: 'ENV_ACCESS_BLOCKED',
          severity: 'HIGH',
          variable: prop,
          description: `Attempt to access non-whitelisted environment variable: ${prop}`,
          timestamp: new Date()
        };
        self.violations.push(violation);

        console.warn(`⚠️  SECURITY: Blocked access to environment variable: ${prop}`);
        return undefined;
      },

      set(target, prop: string | symbol, value: any): boolean {
        // Block all environment variable modifications
        const violation: EnvironmentViolation = {
          type: 'ENV_ACCESS_BLOCKED',
          severity: 'HIGH',
          variable: typeof prop === 'string' ? prop : prop.toString(),
          description: `Attempt to modify environment variable: ${prop.toString()}`,
          timestamp: new Date()
        };
        self.violations.push(violation);

        console.error(`🚨 SECURITY: Blocked attempt to modify environment variable: ${prop.toString()}`);
        throw new Error(`Modifying environment variables is not allowed`);
      },

      has(target, prop: string | symbol): boolean {
        if (typeof prop !== 'string') {
          return false;
        }

        // Only report 'has' for allowed variables
        return self.ALLOWED_VARS.has(prop.toUpperCase());
      },

      ownKeys(target): ArrayLike<string | symbol> {
        // Only return allowed variables when enumerating
        const violation: EnvironmentViolation = {
          type: 'ENV_ENUMERATION',
          severity: 'HIGH',
          description: 'Attempt to enumerate environment variables',
          timestamp: new Date()
        };
        self.violations.push(violation);

        console.warn('⚠️  SECURITY: Blocked environment variable enumeration');
        return Array.from(self.ALLOWED_VARS);
      },

      getOwnPropertyDescriptor(target, prop: string | symbol) {
        if (typeof prop !== 'string' || !self.ALLOWED_VARS.has(prop.toUpperCase())) {
          return undefined;
        }

        return {
          enumerable: true,
          configurable: true,
          value: self.originalProcessEnv[prop]
        };
      }
    });

    // Replace process.env with the secure proxy
    Object.defineProperty(process, 'env', {
      value: secureEnv,
      writable: false,
      configurable: false
    });
  }

  /**
   * Get environment security violations
   */
  public getViolations(): EnvironmentViolation[] {
    return [...this.violations];
  }

  /**
   * Clear violation history
   */
  public clearViolations(): void {
    this.violations = [];
  }

  /**
   * Get security report for environment access
   */
  public getSecurityReport(): {
    totalViolations: number;
    sensitiveAccessAttempts: number;
    blockedAccessAttempts: number;
    enumerationAttempts: number;
    isSecure: boolean;
  } {
    const sensitiveAccess = this.violations.filter(v => v.type === 'SENSITIVE_VAR_ACCESS').length;
    const blockedAccess = this.violations.filter(v => v.type === 'ENV_ACCESS_BLOCKED').length;
    const enumeration = this.violations.filter(v => v.type === 'ENV_ENUMERATION').length;
    const criticalViolations = this.violations.filter(v => v.severity === 'CRITICAL').length;

    return {
      totalViolations: this.violations.length,
      sensitiveAccessAttempts: sensitiveAccess,
      blockedAccessAttempts: blockedAccess,
      enumerationAttempts: enumeration,
      isSecure: criticalViolations === 0
    };
  }

  /**
   * Create a safe environment subset for code execution
   */
  public createSafeEnvironment(): Record<string, string> {
    const safeEnv: Record<string, string> = {};
    
    // Only include allowed variables
    for (const varName of this.ALLOWED_VARS) {
      const value = this.originalProcessEnv[varName];
      if (value !== undefined) {
        safeEnv[varName] = value;
      }
    }

    // Add some safe defaults
    safeEnv.NODE_ENV = 'sandbox';
    safeEnv.SANDBOX = 'true';
    
    return safeEnv;
  }

  /**
   * Test environment blocking (for security validation)
   */
  public testBlocking(): {
    success: boolean;
    tests: { name: string; passed: boolean; error?: string }[];
  } {
    const tests = [
      {
        name: 'Block sensitive variable access (API_KEY)',
        test: () => {
          try {
            const _ = process.env.API_KEY;
            return { passed: false, error: 'Should have thrown an error' };
          } catch (error) {
            return { passed: true };
          }
        }
      },
      {
        name: 'Allow whitelisted variable access (NODE_ENV)',
        test: () => {
          try {
            const nodeEnv = process.env.NODE_ENV;
            return { passed: true };
          } catch (error) {
            return { passed: false, error: 'Should have allowed access' };
          }
        }
      },
      {
        name: 'Block environment variable modification',
        test: () => {
          try {
            (process.env as any).TEST_VAR = 'test';
            return { passed: false, error: 'Should have thrown an error' };
          } catch (error) {
            return { passed: true };
          }
        }
      },
      {
        name: 'Block environment enumeration',
        test: () => {
          try {
            const keys = Object.keys(process.env);
            // Should only return allowed variables
            const hasBlockedVars = keys.some(key => 
              this.SENSITIVE_VARS.has(key.toUpperCase()) || 
              !this.ALLOWED_VARS.has(key.toUpperCase())
            );
            return { passed: !hasBlockedVars };
          } catch (error) {
            return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      }
    ];

    const results = tests.map(({ name, test }) => {
      const result = test();
      return { name, ...result };
    });

    const allPassed = results.every(r => r.passed);

    return {
      success: allPassed,
      tests: results
    };
  }
}

// Initialize environment blocking immediately when module is loaded
const environmentBlocker = EnvironmentBlocker.getInstance();

export { environmentBlocker };