import { deductCredit, refundCredit, getActiveJobCount } from '../../src/services/credits';

describe('Credits Service', () => {
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
  });

  describe('deductCredit', () => {
    it('should return true when credit is successfully deducted', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1, rows: [{ credits: 9 }] });

      const result = await deductCredit('user-123', mockPool);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET credits = credits - 1'),
        ['user-123']
      );
    });

    it('should return false when user has no credits', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

      const result = await deductCredit('user-123', mockPool);

      expect(result).toBe(false);
    });

    it('should use CHECK constraint (credits >= 0) for atomicity', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1, rows: [{ credits: 0 }] });

      await deductCredit('user-123', mockPool);

      // The WHERE clause ensures credits > 0 before deduction
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('credits > 0'),
        expect.any(Array)
      );
    });
  });

  describe('refundCredit', () => {
    it('should increment credit by 1', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await refundCredit('user-123', mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('credits = credits + 1'),
        ['user-123']
      );
    });
  });

  describe('getActiveJobCount', () => {
    it('should count jobs with queued or processing status', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '3' }] });

      const count = await getActiveJobCount('user-123', mockPool);

      expect(count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('queued', 'processing')"),
        ['user-123']
      );
    });

    it('should return 0 when no active jobs', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const count = await getActiveJobCount('user-123', mockPool);

      expect(count).toBe(0);
    });
  });
});
