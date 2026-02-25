import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db';
import { AppError } from '../middleware/errorHandler';
import { deliverWebhook } from '../services/webhook';
import { CallbackPayload, Job, User, WebhookPayload } from '../types';

const router = Router();

// POST /internal/callback
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body as CallbackPayload;

    if (!payload.jobId || !payload.status) {
      throw new AppError(400, 'VALIDATION_ERROR', 'jobId and status are required');
    }

    if (!['completed', 'failed'].includes(payload.status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'status must be "completed" or "failed"');
    }

    const pool = getPool();

    // Fetch the job
    const jobResult = await pool.query<Job>(
      'SELECT * FROM jobs WHERE id = $1',
      [payload.jobId]
    );

    if (jobResult.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Job not found');
    }

    const job = jobResult.rows[0];

    // Update job status
    if (payload.status === 'completed') {
      await pool.query(
        `UPDATE jobs SET status = 'completed', result_url = $2, completed_at = NOW()
         WHERE id = $1`,
        [payload.jobId, payload.resultUrl || null]
      );
    } else {
      await pool.query(
        `UPDATE jobs SET status = 'failed', error = $2, failed_at = NOW()
         WHERE id = $1`,
        [
          payload.jobId,
          JSON.stringify(payload.error || { code: 'PROCESSING_FAILED', message: 'Job processing failed' }),
        ]
      );
    }

    // Deliver webhook if configured
    if (job.webhook_url) {
      const userResult = await pool.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [job.user_id]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const webhookPayload: WebhookPayload = {
          event: payload.status === 'completed' ? 'job.completed' : 'job.failed',
          jobId: payload.jobId,
          status: payload.status,
          timestamp: new Date().toISOString(),
        };

        if (payload.status === 'completed' && payload.resultUrl) {
          webhookPayload.resultUrl = payload.resultUrl;
        }

        if (payload.status === 'failed' && payload.error) {
          webhookPayload.error = payload.error;
        }

        // Fire and forget - don't block callback response
        deliverWebhook(job.webhook_url, webhookPayload, user.webhook_secret).catch(
          (err) => console.error(`Webhook delivery error for job ${payload.jobId}:`, err)
        );
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

export { router as callbackRouter };
