#!/usr/bin/env node

/**
 * Enhanced Security Test Suite for CodeContext Pro
 * Focused on identifying critical security vulnerabilities
 */

const http = require('http');
const util = require('util');

class SecurityTestSuite {
  constructor() {
    this.executionEngineUrl = 'http://localhost:3001';
    this.vulnerabilities = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      critical: '\x1b[41m\x1b[97m', // Red background, white text
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve) => {
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

  async testSecurityVulnerability(testName, code, expectedToFail = true, language = 'javascript') {
    this.log(`🔍 Testing: ${testName}`, 'info');
    
    const response = await this.httpRequest(`${this.executionEngineUrl}/execute`, {
      method: 'POST',
      data: { language, code }
    });

    if (!response.success) {
      this.log(`❌ HTTP Request failed: ${testName}`, 'error');
      this.failed++;
      return;
    }

    const result = response.parsed;
    const executionSucceeded = result.success;
    const securityReport = result.securityReport;
    const output = result.output;

    // Check for critical security violations
    if (executionSucceeded && expectedToFail) {
      // If the code executed successfully when it should have been blocked
      if (!securityReport || securityReport.riskLevel === 'low') {
        this.vulnerabilities.push({
          test: testName,
          severity: 'CRITICAL',
          description: 'Code executed successfully without security detection',
          output: output,
          securityReport: securityReport
        });
        this.log(`🚨 CRITICAL VULNERABILITY: ${testName}`, 'critical');
        this.log(`   Code executed: ${executionSucceeded}`, 'critical');
        this.log(`   Risk level: ${securityReport?.riskLevel || 'unknown'}`, 'critical');
        this.failed++;
        return;
      }
    }

    if (expectedToFail && !executionSucceeded) {
      this.log(`✅ SECURE: ${testName} - properly blocked`, 'success');
      this.passed++;
    } else if (!expectedToFail && executionSucceeded) {
      this.log(`✅ ALLOWED: ${testName} - executed as expected`, 'success');
      this.passed++;
    } else {
      this.log(`⚠️  UNCLEAR: ${testName}`, 'warning');
      this.failed++;
    }
  }

  async runSecurityTests() {
    this.log('🛡️  Starting Enhanced Security Test Suite', 'info');
    this.log('🎯 Testing for critical security vulnerabilities\n', 'info');

    // File System Access Tests
    await this.testSecurityVulnerability(
      'File System Read - /etc/passwd',
      `const fs = require('fs'); 
       try { 
         const data = fs.readFileSync('/etc/passwd', 'utf8'); 
         console.log('PASSWD FILE:', data.substring(0, 100)); 
       } catch(e) { 
         console.log('Access denied:', e.message); 
       }`,
      true
    );

    await this.testSecurityVulnerability(
      'File System Write - Temp file',
      `const fs = require('fs'); 
       try { 
         fs.writeFileSync('/tmp/malicious.txt', 'I can write files!'); 
         console.log('File written successfully'); 
       } catch(e) { 
         console.log('Write denied:', e.message); 
       }`,
      true
    );

    await this.testSecurityVulnerability(
      'Directory Listing',
      `const fs = require('fs'); 
       try { 
         const files = fs.readdirSync('/'); 
         console.log('Root directory:', files); 
       } catch(e) { 
         console.log('Directory access denied:', e.message); 
       }`,
      true
    );

    // Process Spawning Tests
    await this.testSecurityVulnerability(
      'Process Spawning - ls command',
      `const { spawn } = require('child_process'); 
       try { 
         const proc = spawn('ls', ['-la']); 
         proc.stdout.on('data', data => console.log('COMMAND OUTPUT:', data.toString())); 
         proc.stderr.on('data', data => console.log('COMMAND ERROR:', data.toString())); 
       } catch(e) { 
         console.log('Process spawn denied:', e.message); 
       }`,
      true
    );

    await this.testSecurityVulnerability(
      'Process Spawning - whoami command',
      `const { exec } = require('child_process'); 
       try { 
         exec('whoami', (error, stdout, stderr) => { 
           if (error) console.log('Command failed:', error.message); 
           else console.log('Current user:', stdout); 
         }); 
       } catch(e) { 
         console.log('Exec denied:', e.message); 
       }`,
      true
    );

    // Network Access Tests
    await this.testSecurityVulnerability(
      'Network Access - HTTP Request',
      `const http = require('http'); 
       try { 
         const req = http.get('http://httpbin.org/ip', (res) => { 
           let data = ''; 
           res.on('data', chunk => data += chunk); 
           res.on('end', () => console.log('HTTP Response:', data)); 
         }); 
         req.on('error', e => console.log('HTTP Error:', e.message)); 
       } catch(e) { 
         console.log('Network access denied:', e.message); 
       }`,
      true
    );

    // Resource Exhaustion Tests
    await this.testSecurityVulnerability(
      'Memory Bomb',
      `let memoryHog = []; 
       try { 
         for(let i = 0; i < 1000000; i++) { 
           memoryHog.push(new Array(1000).fill('memory_hog')); 
         } 
         console.log('Memory allocation successful'); 
       } catch(e) { 
         console.log('Memory limit reached:', e.message); 
       }`,
      true
    );

    await this.testSecurityVulnerability(
      'CPU Bomb - Infinite Loop',
      `let startTime = Date.now(); 
       while(Date.now() - startTime < 5000) { 
         // CPU intensive loop for 5 seconds 
         Math.random() * Math.random(); 
       } 
       console.log('CPU bomb completed');`,
      true
    );

    // Environment Variable Access
    await this.testSecurityVulnerability(
      'Environment Variables Access',
      `console.log('Environment variables:', JSON.stringify(process.env, null, 2));`,
      true
    );

    // Module Loading Tests
    await this.testSecurityVulnerability(
      'Dynamic Module Loading',
      `try { 
         const os = require('os'); 
         console.log('OS Info:', os.platform(), os.arch(), os.hostname()); 
       } catch(e) { 
         console.log('OS module denied:', e.message); 
       }`,
      true
    );
  }

  generateSecurityReport() {
    this.log('\n' + '='.repeat(70), 'info');
    this.log('🛡️  SECURITY TEST RESULTS', 'info');
    this.log('='.repeat(70), 'info');

    const total = this.passed + this.failed;
    const securityScore = ((this.passed / total) * 100).toFixed(1);

    this.log(`📊 Total Security Tests: ${total}`, 'info');
    this.log(`✅ Secure (Blocked): ${this.passed}`, 'success');
    this.log(`❌ Vulnerable (Allowed): ${this.failed}`, 'error');
    this.log(`🛡️  Security Score: ${securityScore}%`, securityScore > 80 ? 'success' : 'critical');

    if (this.vulnerabilities.length > 0) {
      this.log('\n🚨 CRITICAL VULNERABILITIES FOUND:', 'critical');
      this.vulnerabilities.forEach((vuln, index) => {
        this.log(`\n${index + 1}. ${vuln.test} (${vuln.severity})`, 'critical');
        this.log(`   Description: ${vuln.description}`, 'error');
        if (vuln.output) {
          this.log(`   Output: ${vuln.output.substring(0, 100)}...`, 'error');
        }
      });
    }

    this.log('\n🎯 SECURITY ASSESSMENT:', 'info');
    if (this.vulnerabilities.length === 0 && securityScore >= 90) {
      this.log('🏆 EXCELLENT: System is highly secure!', 'success');
    } else if (this.vulnerabilities.length <= 2 && securityScore >= 70) {
      this.log('⚠️  MODERATE: Some security issues need attention', 'warning');
    } else {
      this.log('🚨 CRITICAL: Major security vulnerabilities detected!', 'critical');
      this.log('   System is NOT SAFE for production use!', 'critical');
    }

    return {
      totalTests: total,
      passed: this.passed,
      failed: this.failed,
      securityScore: parseFloat(securityScore),
      vulnerabilities: this.vulnerabilities,
      isSecure: this.vulnerabilities.length === 0 && securityScore >= 80
    };
  }
}

// Run the security test suite
if (require.main === module) {
  const securitySuite = new SecurityTestSuite();
  
  securitySuite.runSecurityTests().then(() => {
    const results = securitySuite.generateSecurityReport();
    process.exit(results.isSecure ? 0 : 1);
  }).catch(error => {
    console.error('Security test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = SecurityTestSuite;