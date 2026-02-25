import { formatJobResponse, generateJobId } from '../../src/routes/jobs';
import { Job } from '../../src/types';

describe('Jobs Route - Helper Functions', () => {
  describe('generateJobId', () => {
    it('should generate IDs with job_ prefix', () => {
      const id = generateJobId();
      expect(id).toMatch(/^job_[a-f0-9]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateJobId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('formatJobResponse', () => {
    const baseJob: Job = {
      id: 'job_abc123def456',
      user_id: 'user-123',
      status: 'queued',
      image_url: 'https://example.com/image.png',
      webhook_url: 'https://example.com/webhook',
      options: { quality: 'high' },
      result_url: null,
      error: null,
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      completed_at: null,
      failed_at: null,
    };

    it('should format queued job correctly', () => {
      const response = formatJobResponse(baseJob);

      expect(response).toEqual({
        jobId: 'job_abc123def456',
        status: 'queued',
        createdAt: '2024-01-01T00:00:00.000Z',
        imageUrl: 'https://example.com/image.png',
        webhookUrl: 'https://example.com/webhook',
        options: { quality: 'high' },
      });
    });

    it('should format processing job correctly', () => {
      const job = { ...baseJob, status: 'processing' as const };
      const response = formatJobResponse(job);

      expect(response.status).toBe('processing');
      expect(response.imageUrl).toBeDefined();
    });

    it('should format completed job with resultUrl', () => {
      const job: Job = {
        ...baseJob,
        status: 'completed',
        result_url: 'https://cdn.vibepeak.com/results/job_abc123.png',
        completed_at: new Date('2024-01-01T00:05:00.000Z'),
      };
      const response = formatJobResponse(job);

      expect(response).toEqual({
        jobId: 'job_abc123def456',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00.000Z',
        resultUrl: 'https://cdn.vibepeak.com/results/job_abc123.png',
        completedAt: '2024-01-01T00:05:00.000Z',
      });
    });

    it('should format failed job with error', () => {
      const job: Job = {
        ...baseJob,
        status: 'failed',
        error: { code: 'PROCESSING_FAILED', message: 'Something went wrong' },
        failed_at: new Date('2024-01-01T00:03:00.000Z'),
      };
      const response = formatJobResponse(job);

      expect(response).toEqual({
        jobId: 'job_abc123def456',
        status: 'failed',
        createdAt: '2024-01-01T00:00:00.000Z',
        error: { code: 'PROCESSING_FAILED', message: 'Something went wrong' },
        failedAt: '2024-01-01T00:03:00.000Z',
      });
    });

    it('should not include imageUrl/webhookUrl for completed jobs', () => {
      const job: Job = {
        ...baseJob,
        status: 'completed',
        result_url: 'https://cdn.vibepeak.com/results/job_abc123.png',
        completed_at: new Date(),
      };
      const response = formatJobResponse(job);

      expect(response.imageUrl).toBeUndefined();
      expect(response.webhookUrl).toBeUndefined();
    });

    it('should not include imageUrl/webhookUrl for failed jobs', () => {
      const job: Job = {
        ...baseJob,
        status: 'failed',
        error: { code: 'ERR', message: 'fail' },
        failed_at: new Date(),
      };
      const response = formatJobResponse(job);

      expect(response.imageUrl).toBeUndefined();
      expect(response.webhookUrl).toBeUndefined();
    });

    it('should handle job without webhookUrl', () => {
      const job = { ...baseJob, webhook_url: null };
      const response = formatJobResponse(job);

      expect(response.webhookUrl).toBeUndefined();
    });

    it('should handle job without options', () => {
      const job = { ...baseJob, options: null };
      const response = formatJobResponse(job);

      expect(response.options).toBeUndefined();
    });
  });
});
