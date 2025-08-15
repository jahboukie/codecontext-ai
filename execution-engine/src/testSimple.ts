import express from 'express';
import { SimpleExecutionEngine } from './simpleExecutionEngine';

const app = express();
app.use(express.json());

const engine = new SimpleExecutionEngine();

app.post('/execute', async (req, res) => {
  try {
    const result = await engine.executeCode(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      output: '',
      errors: [error.message],
      executionTime: 0,
      memoryUsage: 0
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', engine: 'simple' });
});

const port = 3002;
app.listen(port, () => {
  console.log(`🚀 Simple test server running on port ${port}`);
});