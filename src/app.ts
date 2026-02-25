import express from 'express';
import { jobsRouter } from './routes/jobs';
import { callbackRouter } from './routes/callback';
import { mockRouter } from './routes/mock';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public API routes
app.use('/v1/jobs', jobsRouter);

// Internal routes
app.use('/internal/callback', callbackRouter);

// Mock processing service (for local development/testing)
app.use('/mock', mockRouter);

// Error handler (must be last)
app.use(errorHandler);

export { app };
