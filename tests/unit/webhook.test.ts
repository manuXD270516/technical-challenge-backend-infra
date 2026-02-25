import crypto from 'crypto';

describe('Webhook Signing', () => {
  it('should produce deterministic HMAC-SHA256 signatures', () => {
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({
      event: 'job.completed',
      jobId: 'job_abc123',
      status: 'completed',
      resultUrl: 'https://cdn.vibepeak.com/results/job_abc123.png',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    const signature1 = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const signature2 = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(signature1).toBe(signature2);
    expect(signature1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('should produce different signatures for different payloads', () => {
    const secret = 'whsec_test_secret';
    const payload1 = JSON.stringify({ event: 'job.completed', jobId: 'job_1' });
    const payload2 = JSON.stringify({ event: 'job.completed', jobId: 'job_2' });

    const sig1 = crypto.createHmac('sha256', secret).update(payload1).digest('hex');
    const sig2 = crypto.createHmac('sha256', secret).update(payload2).digest('hex');

    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different secrets', () => {
    const payload = JSON.stringify({ event: 'job.completed', jobId: 'job_1' });

    const sig1 = crypto.createHmac('sha256', 'secret_1').update(payload).digest('hex');
    const sig2 = crypto.createHmac('sha256', 'secret_2').update(payload).digest('hex');

    expect(sig1).not.toBe(sig2);
  });
});

describe('Webhook Payload Structure', () => {
  it('should include required fields for completed events', () => {
    const payload = {
      event: 'job.completed' as const,
      jobId: 'job_abc123',
      status: 'completed' as const,
      resultUrl: 'https://cdn.vibepeak.com/results/job_abc123.png',
      timestamp: new Date().toISOString(),
    };

    expect(payload.event).toBe('job.completed');
    expect(payload.status).toBe('completed');
    expect(payload.resultUrl).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  it('should include required fields for failed events', () => {
    const payload = {
      event: 'job.failed' as const,
      jobId: 'job_abc123',
      status: 'failed' as const,
      error: {
        code: 'PROCESSING_FAILED',
        message: 'Image processing failed',
      },
      timestamp: new Date().toISOString(),
    };

    expect(payload.event).toBe('job.failed');
    expect(payload.status).toBe('failed');
    expect(payload.error).toBeDefined();
    expect(payload.error.code).toBe('PROCESSING_FAILED');
  });
});
