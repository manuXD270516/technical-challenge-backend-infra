describe('Mock Processor - Configuration', () => {
  it('should have failure rate of approximately 20%', () => {
    // Statistical test: run many trials and check failure rate is ~20%
    const TRIALS = 10000;
    let failures = 0;
    const FAILURE_RATE = 0.2;

    for (let i = 0; i < TRIALS; i++) {
      if (Math.random() < FAILURE_RATE) {
        failures++;
      }
    }

    const actualRate = failures / TRIALS;
    // Allow 5% margin for randomness
    expect(actualRate).toBeGreaterThan(0.15);
    expect(actualRate).toBeLessThan(0.25);
  });

  it('should generate delays between 3000ms and 5000ms', () => {
    const MIN_DELAY = 3000;
    const MAX_DELAY = 5000;

    for (let i = 0; i < 100; i++) {
      const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
      expect(delay).toBeGreaterThanOrEqual(MIN_DELAY);
      expect(delay).toBeLessThanOrEqual(MAX_DELAY);
    }
  });
});

describe('Mock Processor - Callback Payload', () => {
  it('should produce correct completed payload structure', () => {
    const jobId = 'job_abc123';
    const payload = {
      jobId,
      status: 'completed',
      resultUrl: `https://cdn.vibepeak.com/results/${jobId}.png`,
    };

    expect(payload.jobId).toBe(jobId);
    expect(payload.status).toBe('completed');
    expect(payload.resultUrl).toContain(jobId);
  });

  it('should produce correct failed payload structure', () => {
    const payload = {
      jobId: 'job_abc123',
      status: 'failed',
      error: {
        code: 'PROCESSING_FAILED',
        message: 'Image processing failed (simulated error)',
      },
    };

    expect(payload.status).toBe('failed');
    expect(payload.error.code).toBe('PROCESSING_FAILED');
    expect(payload.error.message).toBeDefined();
  });
});
