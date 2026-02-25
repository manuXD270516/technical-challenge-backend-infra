import { Pool } from 'pg';
import { getPool } from '../db';

export async function deductCredit(userId: string, pool?: Pool): Promise<boolean> {
  const db = pool || getPool();
  const result = await db.query(
    `UPDATE users SET credits = credits - 1
     WHERE id = $1 AND credits > 0
     RETURNING credits`,
    [userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function refundCredit(userId: string, pool?: Pool): Promise<void> {
  const db = pool || getPool();
  await db.query(
    'UPDATE users SET credits = credits + 1 WHERE id = $1',
    [userId]
  );
}

export async function getActiveJobCount(userId: string, pool?: Pool): Promise<number> {
  const db = pool || getPool();
  const result = await db.query(
    `SELECT COUNT(*) as count FROM jobs
     WHERE user_id = $1 AND status IN ('queued', 'processing')`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}
