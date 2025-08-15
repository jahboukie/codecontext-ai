import express from 'express';
import { ExecutionRequest, ExecutionResult } from './executionEngine';
import { SimpleExecutionEngine } from './simpleExecutionEngine';
import { ExecutionMemoryManager } from './memoryIntegration';
import chalk from 'chalk';
import * as path from 'path';

const app = express();
app.use(express.json());

// 🚀 Initialize SIMPLE execution engine without security barriers
const simpleExecutionEngine = new SimpleExecutionEngine();
let memoryManager: ExecutionMemoryManager | null = null;

// Memory integration disabled for barrier-free execution  
async function initializeMemoryManager(projectPath: string) {
  console.log(chalk.gray('🧠 Memory integration disabled (barrier-free mode)'));
}

// Main execution endpoint - barrier-free execution
app.post('/execute', async (req, res) => {
  try {
    const request: ExecutionRequest = req.body;
    
    console.log(chalk.cyan(`🚀 Executing ${request.language} code...`));
    
    // Direct execution without barriers
    const result = await simpleExecutionEngine.executeCode(request);
    
    // Log result
    if (result.success) {
      console.log(chalk.green('✅ Execution successful'));
    } else {
      console.log(chalk.red('❌ Execution failed:'), result.errors);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error(chalk.red('💥 Execution engine error:'), error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      output: '',
      errors: [error instanceof Error ? error.message : String(error)],
      executionTime: 0,
      memoryUsage: 0
    });
  }
});

// Get execution history - disabled in barrier-free mode
app.get('/history', async (req, res) => {
  res.json({ message: 'History disabled in barrier-free mode', executions: [] });
});

// Get code patterns - disabled in barrier-free mode
app.get('/patterns/:language', async (req, res) => {
  res.json({ message: 'Patterns disabled in barrier-free mode', patterns: [] });
});

// Get error patterns - disabled in barrier-free mode
app.get('/errors/:language', async (req, res) => {
  res.json({ message: 'Error patterns disabled in barrier-free mode', errors: [] });
});

// Get performance insights - disabled in barrier-free mode  
app.get('/performance/:language', async (req, res) => {
  res.json({ message: 'Performance insights disabled in barrier-free mode', insights: {} });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'barrier-free',
    timestamp: new Date().toISOString(),
    features: {
      execution: true,
      memory: false,
      prediction: false,
      learning: false,
      security: false
    }
  });
});

// 🚀 Security status endpoint (no security barriers)
app.get('/security/status', (req, res) => {
  try {
    const securityStatus = simpleExecutionEngine.getSecurityStatus();
    res.json({
      status: 'simple',
      timestamp: new Date().toISOString(),
      ...securityStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize and start server
async function startServer() {
  const port = process.env.PORT || 3001;
  
  console.log(chalk.cyan('\n🚀 CodeContext Pro Simple Execution Engine\n'));
  console.log(chalk.gray('Local Development Mode: No Security Barriers'));
  
  // Initialize memory manager if project path is provided
  const projectPath = process.env.PROJECT_PATH || process.cwd();
  if (projectPath) {
    try {
      await initializeMemoryManager(projectPath);
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Memory integration not available:'), error);
    }
  }
  
  app.listen(port, () => {
    console.log(chalk.green(`\n✅ Simple Execution Engine running on port ${port}`));
    console.log(chalk.gray(`   Memory Integration: ${memoryManager ? '🧠 Active' : '❌ Disabled'}`));
    console.log(chalk.gray(`   Security Barriers: 🚫 Disabled (Local Dev Mode)`));
    console.log(chalk.gray(`   Multi-Language Support: 🌐 JS/TS/Python/Go/Rust`));
    console.log(chalk.gray('\n🚀 Ready for barrier-free code execution!\n'));
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down Execution Engine...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n👋 Shutting down Execution Engine...'));
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error(chalk.red('💥 Failed to start Execution Engine:'), error);
    process.exit(1);
  });
}

export { app, SimpleExecutionEngine, ExecutionMemoryManager };
