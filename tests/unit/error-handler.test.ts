import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../../src/middleware/errorHandler';

describe('Error Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should handle AppError with correct status code and body', () => {
    const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid input');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
    });
  });

  it('should handle 401 Unauthorized AppError', () => {
    const error = new AppError(401, 'UNAUTHORIZED', 'Missing API key');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing API key',
      },
    });
  });

  it('should handle 402 Payment Required AppError', () => {
    const error = new AppError(402, 'INSUFFICIENT_CREDITS', 'Insufficient credits');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(402);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: 'Insufficient credits',
      },
    });
  });

  it('should handle 429 Too Many Requests AppError', () => {
    const error = new AppError(429, 'CONCURRENCY_LIMIT', 'Limit reached');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'CONCURRENCY_LIMIT',
        message: 'Limit reached',
      },
    });
  });

  it('should handle unknown errors with 500 status', () => {
    const error = new Error('Something went wrong');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });

    consoleSpy.mockRestore();
  });
});
