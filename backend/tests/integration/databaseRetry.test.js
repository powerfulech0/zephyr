const { getPool, initializePool, closePool } = require('../../src/config/database');
const { retryWithBackoff } = require('../../src/services/resilienceService');
const logger = require('../../src/config/logger');

/**
 * Integration Test: Database Retry Logic (T108)
 *
 * Validates that database operations automatically retry with exponential backoff:
 * - Transient failures (connection timeout, deadlock) trigger retries
 * - Exponential backoff: 100ms, 200ms, 400ms, 800ms (max 5 attempts)
 * - Permanent failures (syntax error, constraint violation) don't retry
 * - Failed retries log appropriately
 * - Successful retry after transient failure works correctly
 */
describe('Integration: Database Retry Logic', () => {

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff on transient failures', async () => {
      let attemptCount = 0;
      const delays = [];
      let lastAttemptTime = Date.now();

      // Simulate function that fails 3 times then succeeds
      const transientFailureFunc = async () => {
        attemptCount++;
        const now = Date.now();
        if (attemptCount > 1) {
          delays.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;

        if (attemptCount < 4) {
          const error = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      };

      const result = await retryWithBackoff(transientFailureFunc, {
        maxAttempts: 5,
        initialDelay: 100,
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(4); // 3 failures + 1 success

      // Verify exponential backoff timing (within 50ms tolerance)
      expect(delays[0]).toBeGreaterThanOrEqual(50); // ~100ms
      expect(delays[0]).toBeLessThan(150);

      expect(delays[1]).toBeGreaterThanOrEqual(150); // ~200ms
      expect(delays[1]).toBeLessThan(250);

      expect(delays[2]).toBeGreaterThanOrEqual(350); // ~400ms
      expect(delays[2]).toBeLessThan(450);
    }, 10000);

    it('should respect max attempts limit', async () => {
      let attemptCount = 0;

      const alwaysFailFunc = async () => {
        attemptCount++;
        const error = new Error('Connection refused');
        error.code = 'ECONNREFUSED';
        throw error;
      };

      await expect(
        retryWithBackoff(alwaysFailFunc, {
          maxAttempts: 3,
          initialDelay: 10,
        })
      ).rejects.toThrow('Connection refused');

      expect(attemptCount).toBe(3);
    }, 5000);
  });

  describe('Retryable vs Non-Retryable Errors', () => {
    it('should retry on connection timeout', async () => {
      let attemptCount = 0;

      const timeoutFunc = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new Error('Query timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'recovered';
      };

      const result = await retryWithBackoff(timeoutFunc, {
        maxAttempts: 5,
        initialDelay: 10,
      });

      expect(result).toBe('recovered');
      expect(attemptCount).toBe(2);
    });

    it('should retry on connection refused', async () => {
      let attemptCount = 0;

      const connRefusedFunc = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = new Error('Connection refused');
          error.code = 'ECONNREFUSED';
          throw error;
        }
        return 'recovered';
      };

      const result = await retryWithBackoff(connRefusedFunc, {
        maxAttempts: 5,
        initialDelay: 10,
      });

      expect(result).toBe('recovered');
      expect(attemptCount).toBe(2);
    });

    it('should NOT retry on syntax errors', async () => {
      let attemptCount = 0;

      const syntaxErrorFunc = async () => {
        attemptCount++;
        const error = new Error('Syntax error in SQL');
        error.code = '42601'; // PostgreSQL syntax error code
        throw error;
      };

      await expect(
        retryWithBackoff(syntaxErrorFunc, {
          maxAttempts: 5,
          initialDelay: 10,
          retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED'],
        })
      ).rejects.toThrow('Syntax error in SQL');

      expect(attemptCount).toBe(1); // Should fail immediately
    });

    it('should NOT retry on constraint violations', async () => {
      let attemptCount = 0;

      const constraintFunc = async () => {
        attemptCount++;
        const error = new Error('Unique constraint violation');
        error.code = '23505'; // PostgreSQL unique violation
        throw error;
      };

      await expect(
        retryWithBackoff(constraintFunc, {
          maxAttempts: 5,
          initialDelay: 10,
          retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED'],
        })
      ).rejects.toThrow('Unique constraint violation');

      expect(attemptCount).toBe(1);
    });
  });

  describe('Real Database Queries with Retry', () => {
    let pool;

    beforeAll(() => {
      // Initialize database pool for this test suite
      initializePool();
      pool = getPool();
    });

    afterAll(async () => {
      // Close database pool after tests
      await closePool();
    });

    it('should successfully retry actual database query on simulated failure', async () => {
      let attemptCount = 0;

      const queryWithRetry = async () => {
        attemptCount++;

        // Simulate failure on first attempt
        if (attemptCount === 1) {
          const error = new Error('Connection lost');
          error.code = 'ECONNRESET';
          throw error;
        }

        // Actual query on retry
        const result = await pool.query('SELECT 1 as test');
        return result.rows[0].test;
      };

      const result = await retryWithBackoff(queryWithRetry, {
        maxAttempts: 3,
        initialDelay: 10,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
      });

      expect(result).toBe(1);
      expect(attemptCount).toBe(2);
    });
  });

  describe('Custom Retry Configuration', () => {
    it('should allow custom initial delay', async () => {
      let attemptCount = 0;
      const delays = [];
      let lastAttemptTime = Date.now();

      const func = async () => {
        attemptCount++;
        const now = Date.now();
        if (attemptCount > 1) {
          delays.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;

        if (attemptCount < 3) {
          const error = new Error('Retry me');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'done';
      };

      await retryWithBackoff(func, {
        maxAttempts: 5,
        initialDelay: 50, // Custom delay
      });

      // First delay should be ~50ms
      expect(delays[0]).toBeGreaterThanOrEqual(40);
      expect(delays[0]).toBeLessThan(100);
    });

    it('should allow custom max delay cap', async () => {
      let attemptCount = 0;
      const delays = [];
      let lastAttemptTime = Date.now();

      const func = async () => {
        attemptCount++;
        const now = Date.now();
        if (attemptCount > 1) {
          delays.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;

        if (attemptCount < 5) {
          const error = new Error('Retry me');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'done';
      };

      await retryWithBackoff(func, {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 300, // Cap at 300ms
      });

      // All delays should be capped at 300ms
      delays.forEach((delay) => {
        expect(delay).toBeLessThan(350);
      });
    });
  });

  describe('Error Logging', () => {
    it('should log retry attempts', async () => {
      const logSpy = jest.spyOn(logger, 'warn').mockImplementation();
      let attemptCount = 0;

      const func = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Transient failure');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      };

      await retryWithBackoff(func, {
        maxAttempts: 5,
        initialDelay: 10,
        shouldLog: true,
      });

      // Should have logged the retry attempts (2 retries)
      expect(logSpy).toHaveBeenCalledTimes(2);

      logSpy.mockRestore();
    });
  });
});
