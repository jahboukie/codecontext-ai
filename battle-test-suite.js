#!/usr/bin/env node

/**
 * CodeContext Pro Battle Test Suite
 * Comprehensive testing framework to validate CLI tool capabilities
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

class BattleTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    this.cliPath = path.join(__dirname, 'cli', 'dist', 'index.js');
    this.executionEngineUrl = 'http://localhost:3001';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFn) {
    this.log(`🧪 Running: ${testName}`, 'info');
    try {
      const result = await testFn();
      if (result.success) {
        this.results.passed++;
        this.log(`✅ PASSED: ${testName}`, 'success');
      } else {
        this.results.failed++;
        this.results.errors.push(`${testName}: ${result.error}`);
        this.log(`❌ FAILED: ${testName} - ${result.error}`, 'error');
      }
      this.results.details.push({
        test: testName,
        success: result.success,
        error: result.error,
        details: result.details
      });
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`${testName}: ${error.message}`);
      this.log(`💥 ERROR: ${testName} - ${error.message}`, 'error');
    }
  }

  async execCli(command, timeout = 10000) {
    const fullCommand = `node ${this.cliPath} ${command}`;
    try {
      const { stdout, stderr } = await execAsync(fullCommand, { timeout });
      return { success: true, stdout, stderr };
    } catch (error) {
      return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve) => {
      const http = require('http');
      const data = options.data ? JSON.stringify(options.data) : null;
      
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            success: res.statusCode < 400,
            statusCode: res.statusCode,
            body: body,
            parsed: (() => {
              try { return JSON.parse(body); } catch { return null; }
            })()
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      if (data) req.write(data);
      req.end();
    });
  }

  // Test 1: CLI Basic Functionality
  async testCliBasics() {
    const versionResult = await this.execCli('--version');
    if (!versionResult.success) {
      return { success: false, error: 'CLI version check failed' };
    }

    const helpResult = await this.execCli('--help');
    if (!helpResult.success || !helpResult.stdout.includes('CodeContext Pro')) {
      return { success: false, error: 'CLI help command failed' };
    }

    const statusResult = await this.execCli('status');
    if (!statusResult.success || !statusResult.stdout.includes('CodeContext Pro Status')) {
      return { success: false, error: 'CLI status command failed' };
    }

    return { 
      success: true, 
      details: {
        version: versionResult.stdout.trim(),
        statusOutput: statusResult.stdout.length
      }
    };
  }

  // Test 2: Memory System Stress Test
  async testMemorySystemStress() {
    const memoryResult = await this.execCli('memory --show');
    if (!memoryResult.success) {
      return { success: false, error: 'Memory show command failed' };
    }

    // Test context generation with various queries
    const testQueries = [
      'performance optimization',
      'security vulnerabilities', 
      'database design patterns',
      'async/await implementation',
      'error handling strategies'
    ];

    for (const query of testQueries) {
      const contextResult = await this.execCli(`context --query "${query}"`);
      if (!contextResult.success) {
        return { success: false, error: `Context generation failed for query: ${query}` };
      }
    }

    return { success: true, details: { queriesProcessed: testQueries.length } };
  }

  // Test 3: Execution Engine Health and Endpoints
  async testExecutionEngineHealth() {
    const healthResponse = await this.httpRequest(`${this.executionEngineUrl}/health`);
    if (!healthResponse.success || !healthResponse.parsed?.status === 'healthy') {
      return { success: false, error: 'Execution engine health check failed' };
    }

    const historyResponse = await this.httpRequest(`${this.executionEngineUrl}/history`);
    if (!historyResponse.success) {
      return { success: false, error: 'History endpoint failed' };
    }

    return { 
      success: true, 
      details: {
        healthStatus: healthResponse.parsed.status,
        features: healthResponse.parsed.features
      }
    };
  }

  // Test 4: Code Execution Security Boundaries
  async testSecurityBoundaries() {
    const maliciousTests = [
      {
        name: 'File system access attempt',
        code: 'const fs = require("fs"); fs.readFileSync("/etc/passwd");',
        language: 'javascript'
      },
      {
        name: 'Network access attempt',
        code: 'const http = require("http"); http.get("http://malicious-site.com");',
        language: 'javascript'
      },
      {
        name: 'Process spawning attempt',
        code: 'const { spawn } = require("child_process"); spawn("rm", ["-rf", "/"]);',
        language: 'javascript'
      },
      {
        name: 'Infinite loop',
        code: 'while(true) { console.log("infinite"); }',
        language: 'javascript'
      }
    ];

    for (const test of maliciousTests) {
      const response = await this.httpRequest(`${this.executionEngineUrl}/execute`, {
        method: 'POST',
        data: { language: test.language, code: test.code }
      });

      // Should either fail execution or detect security risks
      if (response.success && response.parsed) {
        const securityReport = response.parsed.securityReport;
        if (!securityReport || securityReport.riskLevel === 'low') {
          return { 
            success: false, 
            error: `Security test failed: ${test.name} - should have detected risks` 
          };
        }
      }
    }

    return { success: true, details: { securityTestsRun: maliciousTests.length } };
  }

  // Test 5: Performance Under Load
  async testPerformanceLoad() {
    const concurrentRequests = [];
    const requestCount = 10;

    // Create multiple concurrent execution requests
    for (let i = 0; i < requestCount; i++) {
      const promise = this.httpRequest(`${this.executionEngineUrl}/execute`, {
        method: 'POST',
        data: {
          language: 'javascript',
          code: `console.log('Request ${i}'); const start = Date.now(); while(Date.now() - start < 100); console.log('Completed ${i}');`
        }
      });
      concurrentRequests.push(promise);
    }

    const startTime = Date.now();
    const results = await Promise.all(concurrentRequests);
    const endTime = Date.now();

    const successCount = results.filter(r => r.success).length;
    const avgResponseTime = (endTime - startTime) / requestCount;

    if (successCount < requestCount * 0.8) { // 80% success rate minimum
      return { 
        success: false, 
        error: `Load test failed: only ${successCount}/${requestCount} requests succeeded` 
      };
    }

    return { 
      success: true, 
      details: { 
        requestCount, 
        successRate: (successCount / requestCount) * 100,
        avgResponseTime: avgResponseTime
      }
    };
  }

  // Test 6: Complex Code Execution
  async testComplexCodeExecution() {
    const complexTests = [
      {
        name: 'Algorithm implementation',
        code: `
          function quickSort(arr) {
            if (arr.length <= 1) return arr;
            const pivot = arr[Math.floor(arr.length / 2)];
            const left = arr.filter(x => x < pivot);
            const middle = arr.filter(x => x === pivot);
            const right = arr.filter(x => x > pivot);
            return [...quickSort(left), ...middle, ...quickSort(right)];
          }
          const unsorted = [64, 34, 25, 12, 22, 11, 90];
          console.log('Unsorted:', unsorted);
          console.log('Sorted:', quickSort(unsorted));
        `,
        expectedOutput: 'Sorted: 11,12,22,25,34,64,90'
      },
      {
        name: 'Data structure operations',
        code: `
          class Stack {
            constructor() { this.items = []; }
            push(item) { this.items.push(item); }
            pop() { return this.items.pop(); }
            peek() { return this.items[this.items.length - 1]; }
            isEmpty() { return this.items.length === 0; }
          }
          const stack = new Stack();
          [1,2,3,4,5].forEach(n => stack.push(n));
          console.log('Stack operations:');
          while(!stack.isEmpty()) {
            console.log('Popped:', stack.pop());
          }
        `,
        expectedOutput: 'Popped: 5'
      }
    ];

    for (const test of complexTests) {
      const response = await this.httpRequest(`${this.executionEngineUrl}/execute`, {
        method: 'POST',
        data: { language: 'javascript', code: test.code }
      });

      if (!response.success || !response.parsed?.success) {
        return { success: false, error: `Complex execution failed: ${test.name}` };
      }

      if (!response.parsed.output.includes(test.expectedOutput)) {
        return { 
          success: false, 
          error: `Output validation failed: ${test.name} - expected "${test.expectedOutput}"` 
        };
      }
    }

    return { success: true, details: { complexTestsRun: complexTests.length } };
  }

  // Test 7: Error Handling and Recovery
  async testErrorHandling() {
    const errorTests = [
      {
        name: 'Syntax error handling',
        code: 'console.log("missing quote);',
        language: 'javascript'
      },
      {
        name: 'Runtime error handling',
        code: 'console.log(undefinedVariable);',
        language: 'javascript'
      },
      {
        name: 'Type error handling',
        code: 'null.toString();',
        language: 'javascript'
      }
    ];

    for (const test of errorTests) {
      const response = await this.httpRequest(`${this.executionEngineUrl}/execute`, {
        method: 'POST',
        data: { language: test.language, code: test.code }
      });

      if (!response.success) {
        return { success: false, error: `HTTP request failed for ${test.name}` };
      }

      // Should return proper error information
      if (response.parsed?.success === true) {
        return { 
          success: false, 
          error: `Error test failed: ${test.name} - should have failed but succeeded` 
        };
      }

      if (!response.parsed?.errors || response.parsed.errors.length === 0) {
        return { 
          success: false, 
          error: `Error test failed: ${test.name} - no error information returned` 
        };
      }
    }

    return { success: true, details: { errorTestsRun: errorTests.length } };
  }

  // Test 8: Memory Persistence and Data Integrity
  async testMemoryPersistence() {
    // Test memory export
    const exportResult = await this.execCli('memory --export test-export.json');
    if (!exportResult.success) {
      return { success: false, error: 'Memory export failed' };
    }

    // Check if export file exists
    const exportPath = path.join(process.cwd(), 'cli', 'test-export.json');
    if (!fs.existsSync(exportPath)) {
      return { success: false, error: 'Export file was not created' };
    }

    // Validate export file content
    try {
      const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      if (!exportData.project || !exportData.memories) {
        return { success: false, error: 'Invalid export file structure' };
      }
    } catch (error) {
      return { success: false, error: 'Export file is not valid JSON' };
    } finally {
      // Clean up
      if (fs.existsSync(exportPath)) {
        fs.unlinkSync(exportPath);
      }
    }

    return { success: true, details: { exportValidated: true } };
  }

  async generateReport() {
    const total = this.results.passed + this.results.failed;
    const successRate = ((this.results.passed / total) * 100).toFixed(2);

    this.log('\n' + '='.repeat(60), 'info');
    this.log('🏁 BATTLE TEST SUITE RESULTS', 'info');
    this.log('='.repeat(60), 'info');
    this.log(`📊 Total Tests: ${total}`, 'info');
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, 'error');
    this.log(`📈 Success Rate: ${successRate}%`, successRate > 90 ? 'success' : 'warning');

    if (this.results.failed > 0) {
      this.log('\n❌ FAILURES:', 'error');
      this.results.errors.forEach(error => {
        this.log(`  • ${error}`, 'error');
      });
    }

    this.log('\n📋 DETAILED RESULTS:', 'info');
    this.results.details.forEach(detail => {
      const status = detail.success ? '✅' : '❌';
      this.log(`  ${status} ${detail.test}`, detail.success ? 'success' : 'error');
      if (detail.details) {
        Object.entries(detail.details).forEach(([key, value]) => {
          this.log(`     ${key}: ${value}`, 'info');
        });
      }
    });

    // Overall assessment
    this.log('\n🎯 ASSESSMENT:', 'info');
    if (successRate >= 95) {
      this.log('🏆 EXCELLENT: CodeContext Pro is battle-ready for production!', 'success');
    } else if (successRate >= 85) {
      this.log('🥈 GOOD: CodeContext Pro is mostly ready, minor issues to address', 'warning');
    } else if (successRate >= 70) {
      this.log('🥉 FAIR: CodeContext Pro needs significant improvements', 'warning');
    } else {
      this.log('💥 CRITICAL: CodeContext Pro has major issues and is not production-ready', 'error');
    }

    return {
      totalTests: total,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: parseFloat(successRate),
      errors: this.results.errors,
      ready: successRate >= 85
    };
  }

  async runAllTests() {
    this.log('🚀 Starting CodeContext Pro Battle Test Suite', 'info');
    this.log('🎯 Testing CLI tool capabilities under extreme conditions\n', 'info');

    await this.runTest('CLI Basic Functionality', () => this.testCliBasics());
    await this.runTest('Memory System Stress Test', () => this.testMemorySystemStress());
    await this.runTest('Execution Engine Health', () => this.testExecutionEngineHealth());
    await this.runTest('Security Boundaries', () => this.testSecurityBoundaries());
    await this.runTest('Performance Under Load', () => this.testPerformanceLoad());
    await this.runTest('Complex Code Execution', () => this.testComplexCodeExecution());
    await this.runTest('Error Handling & Recovery', () => this.testErrorHandling());
    await this.runTest('Memory Persistence', () => this.testMemoryPersistence());

    return await this.generateReport();
  }
}

// Run the battle test suite
if (require.main === module) {
  const testSuite = new BattleTestSuite();
  testSuite.runAllTests().then(results => {
    process.exit(results.ready ? 0 : 1);
  }).catch(error => {
    console.error('Battle test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = BattleTestSuite;