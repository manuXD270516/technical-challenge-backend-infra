import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'vibepeak',
    user: process.env.DB_USER || 'vibepeak',
    password: process.env.DB_PASSWORD || 'vibepeak_secret',
  },

  processingServiceUrl: process.env.PROCESSING_SERVICE_URL || 'http://localhost:3000/mock/process',
  callbackBaseUrl: process.env.CALLBACK_BASE_URL || 'http://localhost:3000',

  concurrencyLimits: {
    basic: 1,
    pro: 5,
  } as Record<string, number>,

  webhook: {
    maxRetries: 3,
    baseDelayMs: 1000,
  },

  idempotencyKeyTtlMs: 24 * 60 * 60 * 1000, // 24 hours
};
