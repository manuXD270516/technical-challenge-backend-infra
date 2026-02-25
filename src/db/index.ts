import { Pool, PoolConfig } from 'pg';
import { config } from '../config';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const poolConfig: PoolConfig = {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    pool = new Pool(poolConfig);
  }
  return pool;
}

export function setPool(customPool: Pool): void {
  pool = customPool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
