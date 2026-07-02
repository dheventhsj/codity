import {
  calculateRetryDelay,
  shouldRetry,
  RetryConfig,
} from '../../worker/src/strategies/retry.strategy';

describe('Retry Strategy', () => {
  describe('calculateRetryDelay', () => {
    it('should return fixed delay for FIXED strategy', () => {
      const config: RetryConfig = {
        strategy: 'FIXED',
        baseDelay: 5000,
        maxDelay: 300000,
        maxRetries: 3,
      };

      expect(calculateRetryDelay(config, 1)).toBe(5000);
      expect(calculateRetryDelay(config, 2)).toBe(5000);
      expect(calculateRetryDelay(config, 3)).toBe(5000);
    });

    it('should return linearly increasing delay for LINEAR strategy', () => {
      const config: RetryConfig = {
        strategy: 'LINEAR',
        baseDelay: 1000,
        maxDelay: 300000,
        maxRetries: 5,
      };

      expect(calculateRetryDelay(config, 1)).toBe(1000);
      expect(calculateRetryDelay(config, 2)).toBe(2000);
      expect(calculateRetryDelay(config, 3)).toBe(3000);
      expect(calculateRetryDelay(config, 5)).toBe(5000);
    });

    it('should return exponentially increasing delay for EXPONENTIAL strategy', () => {
      const config: RetryConfig = {
        strategy: 'EXPONENTIAL',
        baseDelay: 1000,
        maxDelay: 300000,
        maxRetries: 5,
      };

      const delay1 = calculateRetryDelay(config, 1);
      const delay2 = calculateRetryDelay(config, 2);
      const delay3 = calculateRetryDelay(config, 3);

      // Exponential with jitter: base * 2^(attempt-1) + random jitter
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1300); // 1000 + 30% jitter
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2600);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(5200);
    });

    it('should cap delay at maxDelay', () => {
      const config: RetryConfig = {
        strategy: 'EXPONENTIAL',
        baseDelay: 10000,
        maxDelay: 30000,
        maxRetries: 10,
      };

      const delay = calculateRetryDelay(config, 5);
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it('should cap LINEAR delay at maxDelay', () => {
      const config: RetryConfig = {
        strategy: 'LINEAR',
        baseDelay: 10000,
        maxDelay: 30000,
        maxRetries: 10,
      };

      expect(calculateRetryDelay(config, 5)).toBe(30000); // 10000*5=50000, capped at 30000
    });
  });

  describe('shouldRetry', () => {
    it('should return true when attempts < maxRetries', () => {
      expect(shouldRetry(1, 3)).toBe(true);
      expect(shouldRetry(2, 3)).toBe(true);
    });

    it('should return false when attempts >= maxRetries', () => {
      expect(shouldRetry(3, 3)).toBe(false);
      expect(shouldRetry(4, 3)).toBe(false);
    });

    it('should return false when maxRetries is 0', () => {
      expect(shouldRetry(0, 0)).toBe(false);
    });
  });
});
