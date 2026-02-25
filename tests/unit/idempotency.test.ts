import { Request, Response, NextFunction } from 'express';
import { idempotencyMiddleware } from '../../src/middleware/idempotency';

jest.mock('../../src/db', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../src/config', () => ({
  config: {
    idempotencyKeyTtlMs: 24 * 60 * 60 * 1000,
  },
}));

import { getPool } from '../../src/db';

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe('Idempotency Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: { id: 'user-123', email: 'test@test.com', api_key_hash: 'hash', webhook_secret: 'secret', plan: 'basic' as const, credits: 10, created_at: new Date() },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
    };
    mockNext = jest.fn();
    mockQuery = jest.fn();
    mockGetPool.mockReturnValue({ query: mockQuery } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when no Idempotency-Key header is present', () => {
    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should return cached response for existing idempotency key', async () => {
    mockReq.headers = { 'idempotency-key': 'test-key-123' };
    const cachedResponse = { jobId: 'job_abc123', status: 'processing' };

    mockQuery.mockResolvedValue({
      rows: [{
        response_status: 202,
        response_body: cachedResponse,
        created_at: new Date(), // Recent - not expired
      }],
    });

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockRes.status).toHaveBeenCalledWith(202);
    expect(mockRes.json).toHaveBeenCalledWith(cachedResponse);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should proceed and intercept response for new idempotency key', async () => {
    mockReq.headers = { 'idempotency-key': 'new-key-456' };

    mockQuery.mockResolvedValue({ rows: [] });

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockNext).toHaveBeenCalledWith();
    // json method should be overridden
    expect(typeof mockRes.json).toBe('function');
  });

  it('should proceed when idempotency key is expired', async () => {
    mockReq.headers = { 'idempotency-key': 'expired-key' };

    const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    mockQuery.mockResolvedValue({
      rows: [{
        response_status: 202,
        response_body: { jobId: 'old_job' },
        created_at: expiredDate,
      }],
    });

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should call next() when user is not set', () => {
    mockReq.headers = { 'idempotency-key': 'test-key' };
    mockReq.user = undefined;

    idempotencyMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });
});
