import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/auth';
import { AppError } from '../../src/middleware/errorHandler';

// Mock the db module
jest.mock('../../src/db', () => ({
  getPool: jest.fn(),
}));

import { getPool } from '../../src/db';

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
    mockQuery = jest.fn();
    mockGetPool.mockReturnValue({ query: mockQuery } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject request without Authorization header', () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should reject request with non-Bearer Authorization', () => {
    mockReq.headers = { authorization: 'Basic abc123' };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('should reject request with empty Bearer token', () => {
    mockReq.headers = { authorization: 'Bearer ' };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('should reject request with invalid API key', async () => {
    mockReq.headers = { authorization: 'Bearer invalid_key' };
    mockQuery.mockResolvedValue({ rows: [] });

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should authenticate valid API key and set req.user', async () => {
    const apiKey = 'vp_test_basic_key_123456';
    const expectedHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const mockUser = {
      id: 'user-123',
      email: 'test@vibepeak.com',
      api_key_hash: expectedHash,
      plan: 'basic',
      credits: 10,
    };

    mockReq.headers = { authorization: `Bearer ${apiKey}` };
    mockQuery.mockResolvedValue({ rows: [mockUser] });

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE api_key_hash = $1',
      [expectedHash]
    );
    expect(mockReq.user).toEqual(mockUser);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should hash the API key with SHA-256', async () => {
    const apiKey = 'test_key';
    const expectedHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    mockReq.headers = { authorization: `Bearer ${apiKey}` };
    mockQuery.mockResolvedValue({ rows: [] });

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    await new Promise(process.nextTick);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [expectedHash]
    );
  });
});
