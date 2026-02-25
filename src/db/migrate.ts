import { getPool, closePool } from './index';

const MIGRATIONS = [
  {
    name: '001_create_users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        api_key_hash VARCHAR(64) NOT NULL UNIQUE,
        webhook_secret VARCHAR(64) NOT NULL,
        plan VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
        credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(api_key_hash);
    `,
  },
  {
    name: '002_create_jobs',
    sql: `
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(50) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
        image_url TEXT NOT NULL,
        webhook_url TEXT,
        options JSONB,
        result_url TEXT,
        error JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
    `,
  },
  {
    name: '003_create_idempotency_keys',
    sql: `
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        response_status INTEGER NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (key, user_id)
      );
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const migration of MIGRATIONS) {
    const result = await pool.query(
      'SELECT name FROM _migrations WHERE name = $1',
      [migration.name]
    );

    if (result.rows.length === 0) {
      console.log(`Running migration: ${migration.name}`);
      await pool.query(migration.sql);
      await pool.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [migration.name]
      );
      console.log(`Migration ${migration.name} completed`);
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('All migrations completed');
      return closePool();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
