import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { AppError } from '../middleware/errorHandler';
import { validateUrl } from '../validators/url';
import { deductCredit, refundCredit, getActiveJobCount } from '../services/credits';
import { dispatchToProcessingService } from '../services/processing';
import { CreateJobRequest, Job, JobResponse } from '../types';

const router = Router();

function generateJobId(): string {
  return `job_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

function formatJobResponse(job: Job): JobResponse {
  const response: JobResponse = {
    jobId: job.id,
    status: job.status,
    createdAt: job.created_at.toISOString(),
  };

  if (job.status === 'queued' || job.status === 'processing') {
    response.imageUrl = job.image_url;
    if (job.webhook_url) response.webhookUrl = job.webhook_url;
    if (job.options) response.options = job.options;
  }

  if (job.status === 'completed') {
    response.resultUrl = job.result_url || undefined;
    response.completedAt = job.completed_at?.toISOString();
  }

  if (job.status === 'failed') {
    response.error = job.error || undefined;
    response.failedAt = job.failed_at?.toISOString();
  }

  return response;
}

// POST /v1/jobs
router.post(
  '/',
  authMiddleware,
  idempotencyMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const body = req.body as CreateJobRequest;

      // Validate required fields
      if (!body.imageUrl) {
        throw new AppError(400, 'VALIDATION_ERROR', 'imageUrl is required');
      }

      // Validate imageUrl (SSRF prevention)
      const imageUrlValidation = await validateUrl(body.imageUrl, false);
      if (!imageUrlValidation.valid) {
        throw new AppError(400, 'INVALID_URL', `Invalid imageUrl: ${imageUrlValidation.error}`);
      }

      // Validate webhookUrl if provided (must be HTTPS + SSRF prevention)
      if (body.webhookUrl) {
        const webhookUrlValidation = await validateUrl(body.webhookUrl, true);
        if (!webhookUrlValidation.valid) {
          throw new AppError(400, 'INVALID_WEBHOOK_URL', `Invalid webhookUrl: ${webhookUrlValidation.error}`);
        }
      }

      // Check concurrency limit
      const activeJobs = await getActiveJobCount(user.id);
      const limit = config.concurrencyLimits[user.plan] || 1;
      if (activeJobs >= limit) {
        throw new AppError(429, 'CONCURRENCY_LIMIT', `Concurrency limit reached (${limit} active jobs for ${user.plan} plan)`);
      }

      // Deduct credit
      const creditDeducted = await deductCredit(user.id);
      if (!creditDeducted) {
        throw new AppError(402, 'INSUFFICIENT_CREDITS', 'Insufficient credits');
      }

      // Create job
      const jobId = generateJobId();
      const pool = getPool();

      await pool.query(
        `INSERT INTO jobs (id, user_id, status, image_url, webhook_url, options)
         VALUES ($1, $2, 'queued', $3, $4, $5)`,
        [jobId, user.id, body.imageUrl, body.webhookUrl || null, body.options ? JSON.stringify(body.options) : null]
      );

      // Dispatch to processing service
      const dispatchResult = await dispatchToProcessingService(
        jobId,
        body.imageUrl,
        body.options || null
      );

      if (!dispatchResult.success) {
        // Refund credit on dispatch failure
        await refundCredit(user.id);

        // Mark job as failed
        await pool.query(
          `UPDATE jobs SET status = 'failed', error = $2, failed_at = NOW()
           WHERE id = $1`,
          [jobId, JSON.stringify({ code: 'DISPATCH_FAILED', message: dispatchResult.error || 'Failed to dispatch job' })]
        );

        throw new AppError(503, 'DISPATCH_FAILED', 'Failed to dispatch job to processing service');
      }

      // Update job status to processing
      await pool.query(
        "UPDATE jobs SET status = 'processing' WHERE id = $1",
        [jobId]
      );

      const jobResult = await pool.query<Job>(
        'SELECT * FROM jobs WHERE id = $1',
        [jobId]
      );

      const response = formatJobResponse(jobResult.rows[0]);
      res.status(202).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// GET /v1/jobs/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const jobId = req.params.id;

      const pool = getPool();
      const result = await pool.query<Job>(
        'SELECT * FROM jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Job not found');
      }

      const job = result.rows[0];

      // Ownership check - return 404 to avoid leaking job existence
      if (job.user_id !== user.id) {
        throw new AppError(404, 'NOT_FOUND', 'Job not found');
      }

      const response = formatJobResponse(job);
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

export { router as jobsRouter, formatJobResponse, generateJobId };
