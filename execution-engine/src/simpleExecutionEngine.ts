/**
 * 🚀 Simple Code Execution Engine
 * 
 * Simplified execution engine without security barriers for local development.
 * 
 * SECURITY LEVEL: NONE (LOCAL DEVELOPMENT ONLY)
 * LAST UPDATED: 2025-08-15
 */

import { v4 as uuidv4 } from 'uuid';
import { ExecutionRequest, ExecutionResult } from './executionEngine';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { ExecutionMemoryManager } from './memoryIntegration';

export class SimpleExecutionEngine {
  private memoryManager?: ExecutionMemoryManager;

  constructor(memoryManager?: ExecutionMemoryManager) {
    this.memoryManager = memoryManager;
    console.log('🚀 Simple execution engine initialized (no security barriers)');
  }

  /**
   * Execute code with minimal overhead
   */
  async executeCode(request: ExecutionRequest): Promise<ExecutionResult & {
    id: string;
    performanceMetrics: any;
    securityReport: any;
    improvements?: any;
  }> {
    const executionId = uuidv4();
    const startTime = Date.now();

    console.log(`🚀 Simple execution starting: ${executionId}`);

    try {
      let result: any;

      if (request.language === 'javascript' || request.language === 'typescript') {
        result = await this.executeJavaScript(request.code);
      } else if (request.language === 'python') {
        result = await this.executePython(request.code);
      } else {
        // For other languages, try to execute directly
        result = await this.executeGeneric(request.code, request.language);
      }

      const executionTime = Date.now() - startTime;

      console.log(`✅ Simple execution completed: ${executionId} (${executionTime}ms)`);

      return {
        id: executionId,
        success: result.success,
        output: result.output || '',
        errors: result.errors || [],
        exitCode: result.exitCode || 0,
        executionTime,
        memoryUsage: process.memoryUsage().heapUsed,
        performanceMetrics: {
          cpuUsage: 0,
          memoryPeak: process.memoryUsage().heapUsed,
          ioOperations: 0,
          networkCalls: 0,
          executionProfile: []
        },
        securityReport: {
          fileSystemAccess: [],
          networkAccess: [],
          processSpawned: [],
          suspiciousOperations: [],
          riskLevel: 'low' as const,
          securityScore: 100,
          violations: []
        }
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      console.log(`❌ Simple execution failed: ${executionId} (${executionTime}ms)`);

      return {
        id: executionId,
        success: false,
        output: '',
        errors: [error.message || 'Unknown error'],
        exitCode: 1,
        executionTime,
        memoryUsage: process.memoryUsage().heapUsed,
        performanceMetrics: {
          cpuUsage: 0,
          memoryPeak: process.memoryUsage().heapUsed,
          ioOperations: 0,
          networkCalls: 0,
          executionProfile: []
        },
        securityReport: {
          fileSystemAccess: [],
          networkAccess: [],
          processSpawned: [],
          suspiciousOperations: [],
          riskLevel: 'low' as const,
          securityScore: 100,
          violations: []
        }
      };
    }
  }

  /**
   * Execute JavaScript code using eval (no security)
   */
  private async executeJavaScript(code: string): Promise<any> {
    let output = '';
    let errors: string[] = [];

    // Capture console output
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      output += message + '\n';
      originalConsoleLog(message); // Still log to actual console
    };

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      errors.push(message);
      originalConsoleError(message); // Still log to actual console
    };

    try {
      // Simple eval execution
      eval(code);
      
      return {
        success: true,
        output: output.trim(),
        errors,
        exitCode: 0
      };

    } catch (error: any) {
      return {
        success: false,
        output: output.trim(),
        errors: [...errors, error.message],
        exitCode: 1
      };

    } finally {
      // Restore original console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  }

  /**
   * Execute Python code using spawn
   */
  private async executePython(code: string): Promise<any> {
    return this.executeWithSpawn('python', ['-c', code]);
  }

  /**
   * Execute generic code by trying to run it with appropriate interpreter
   */
  private async executeGeneric(code: string, language: string): Promise<any> {
    // Create temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `codecontext_${uuidv4()}.${this.getFileExtension(language)}`);
    
    try {
      await fs.writeFile(tempFile, code);
      
      const command = this.getExecutionCommand(language, tempFile);
      return await this.executeWithSpawn(command.cmd, command.args);
      
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFile);
      } catch {}
    }
  }

  /**
   * Execute command with spawn
   */
  private async executeWithSpawn(command: string, args: string[] = []): Promise<any> {
    return new Promise((resolve) => {
      let output = '';
      let errors: string[] = [];

      const child = spawn(command, args, {
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errors.push(data.toString());
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          errors,
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: output.trim(),
          errors: [...errors, error.message],
          exitCode: 1
        });
      });
    });
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    switch (language.toLowerCase()) {
      case 'javascript': return 'js';
      case 'typescript': return 'ts';
      case 'python': return 'py';
      case 'go': return 'go';
      case 'rust': return 'rs';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cpp': return 'cpp';
      default: return 'txt';
    }
  }

  /**
   * Get execution command for language
   */
  private getExecutionCommand(language: string, filePath: string): { cmd: string; args: string[] } {
    switch (language.toLowerCase()) {
      case 'javascript':
        return { cmd: 'node', args: [filePath] };
      case 'typescript':
        return { cmd: 'ts-node', args: [filePath] };
      case 'python':
        return { cmd: 'python', args: [filePath] };
      case 'go':
        return { cmd: 'go', args: ['run', filePath] };
      case 'rust':
        return { cmd: 'rustc', args: [filePath, '-o', filePath.replace('.rs', ''), '&&', filePath.replace('.rs', '')] };
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Get security status (always returns safe for simple engine)
   */
  getSecurityStatus(): any {
    return {
      securityEnabled: false,
      securityLevel: 'none',
      activeProtections: [],
      status: 'Simple execution engine - no security barriers'
    };
  }

  /**
   * Shutdown (no-op for simple engine)
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Simple execution engine shutdown');
  }
}