import { Request, Response, NextFunction } from 'express';
import { getPool } from '../db';
import { config } from '../config';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    next();
    return;
  }

  if (!req.user) {
    next();
    return;
  }

  const pool = getPool();
  const userId = req.user.id;

  pool
    .query(
      `SELECT response_status, response_body, created_at
       FROM idempotency_keys
       WHERE key = $1 AND user_id = $2`,
      [idempotencyKey, userId]
    )
    .then((result) => {
      if (result.rows.length > 0) {
        const record = result.rows[0];
        const age = Date.now() - new Date(record.created_at).getTime();

        if (age < config.idempotencyKeyTtlMs) {
          res.status(record.response_status).json(record.response_body);
          return;
        }
        // Expired key - allow re-use
      }

      // Store original json method to intercept response
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        // Store the idempotency response
        pool
          .query(
            `INSERT INTO idempotency_keys (key, user_id, response_status, response_body)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (key, user_id) DO UPDATE SET
               response_status = $3,
               response_body = $4,
               created_at = NOW()`,
            [idempotencyKey, userId, res.statusCode, body]
          )
          .catch((err) => {
            console.error('Failed to store idempotency key:', err);
          });

        return originalJson(body);
      };

      next();
    })
    .catch(next);
}
