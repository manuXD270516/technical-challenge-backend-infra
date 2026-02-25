import { app } from './app';
import { config } from './config';
import { getPool, closePool } from './db';
import { runMigrations } from './db/migrate';

async function start(): Promise<void> {
  try {
    // Test database connection
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('Database connection established');

    // Run migrations
    await runMigrations();
    console.log('Migrations completed');

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`VibePeak API Gateway running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        console.log('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
