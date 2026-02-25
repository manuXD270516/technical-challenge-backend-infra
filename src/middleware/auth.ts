import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getPool } from '../db';
import { User } from '../types';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing API key'));
    return;
  }

  const apiKeyHash = crypto.createHash('sha256').update(token).digest('hex');

  const pool = getPool();
  pool
    .query<User>('SELECT * FROM users WHERE api_key_hash = $1', [apiKeyHash])
    .then((result) => {
      if (result.rows.length === 0) {
        next(new AppError(401, 'UNAUTHORIZED', 'Invalid API key'));
        return;
      }

      req.user = result.rows[0];
      next();
    })
    .catch(next);
}
