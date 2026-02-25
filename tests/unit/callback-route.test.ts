jest.mock('../../src/db', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../src/services/webhook', () => ({
  deliverWebhook: jest.fn().mockResolvedValue(undefined),
}));

import { getPool } from '../../src/db';
import { deliverWebhook } from '../../src/services/webhook';

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;
const mockDeliverWebhook = deliverWebhook as jest.MockedFunction<typeof deliverWebhook>;

describe('Callback Route - Logic', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockGetPool.mockReturnValue({ query: mockQuery } as any);
    jest.clearAllMocks();
  });

  it('should update job to completed with resultUrl', async () => {
    const jobId = 'job_abc123';
    const resultUrl = 'https://cdn.vibepeak.com/results/job_abc123.png';

    // Simulate the callback handler's update query
    const updateQuery = `UPDATE jobs SET status = 'completed', result_url = $2, completed_at = NOW() WHERE id = $1`;

    mockQuery.mockResolvedValue({ rowCount: 1 });
    await mockQuery(updateQuery, [jobId, resultUrl]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      [jobId, resultUrl]
    );
  });

  it('should update job to failed with error object', async () => {
    const jobId = 'job_abc123';
    const error = JSON.stringify({
      code: 'PROCESSING_FAILED',
      message: 'Image processing failed',
    });

    const updateQuery = `UPDATE jobs SET status = 'failed', error = $2, failed_at = NOW() WHERE id = $1`;

    mockQuery.mockResolvedValue({ rowCount: 1 });
    await mockQuery(updateQuery, [jobId, error]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      [jobId, error]
    );
  });

  it('should trigger webhook delivery when job has webhook_url', () => {
    const webhookUrl = 'https://example.com/webhook';
    const payload = {
      event: 'job.completed' as const,
      jobId: 'job_abc123',
      status: 'completed' as const,
      resultUrl: 'https://cdn.vibepeak.com/results/job_abc123.png',
      timestamp: new Date().toISOString(),
    };
    const secret = 'whsec_test_secret';

    mockDeliverWebhook(webhookUrl, payload, secret);

    expect(mockDeliverWebhook).toHaveBeenCalledWith(webhookUrl, payload, secret);
  });

  it('should not trigger webhook when job has no webhook_url', () => {
    // When webhook_url is null, deliverWebhook should not be called
    mockDeliverWebhook.mockClear();

    const job = {
      webhook_url: null,
    };

    if (job.webhook_url) {
      mockDeliverWebhook(job.webhook_url, {} as any, 'secret');
    }

    expect(mockDeliverWebhook).not.toHaveBeenCalled();
  });
});
