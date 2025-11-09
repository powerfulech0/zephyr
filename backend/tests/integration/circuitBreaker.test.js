const { CircuitBreaker, CircuitBreakerStates } = require('../../src/utils/circuitBreaker');

/**
 * Integration Test: Circuit Breaker Pattern (T110)
 *
 * Validates circuit breaker behavior for protecting against cascading failures:
 * - Opens after failure threshold (5 failures in 60s window)
 * - Rejects requests in OPEN state (fail fast)
 * - Transitions to HALF_OPEN after reset timeout (30s)
 * - Closes after successful test requests in HALF_OPEN state
 * - Tracks success/failure counts and state transitions
 */
describe('Integration: Circuit Breaker', () => {
  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 5,
        resetTimeout: 1000,
      });

      expect(breaker.getState()).toBe(CircuitBreakerStates.CLOSED);
    });

    it('should transition to OPEN after failure threshold', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 3,
        resetTimeout: 5000,
      });

      // Simulate 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Service unavailable');
          })
        ).rejects.toThrow('Service unavailable');
      }

      // Circuit should now be OPEN
      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);
    });

    it('should fail fast in OPEN state', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 2,
        resetTimeout: 5000,
      });

      // Trigger failures to open circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Service down');
          })
        ).rejects.toThrow('Service down');
      }

      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);

      // Next request should fail fast without calling the function
      const mockFn = jest.fn(async () => 'success');
      await expect(breaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');

      // Function should not have been called (fail fast)
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 2,
        resetTimeout: 100, // Short timeout for testing
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Circuit should now be HALF_OPEN
      expect(breaker.getState()).toBe(CircuitBreakerStates.HALF_OPEN);
    }, 10000);

    it('should close after successful requests in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 2,
        resetTimeout: 100,
        successThreshold: 2, // Number of successes needed to close
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe(CircuitBreakerStates.HALF_OPEN);

      // Succeed twice to close circuit
      for (let i = 0; i < 2; i++) {
        const result = await breaker.execute(async () => 'success');
        expect(result).toBe('success');
      }

      // Circuit should be CLOSED again
      expect(breaker.getState()).toBe(CircuitBreakerStates.CLOSED);
    }, 10000);

    it('should reopen if failure occurs in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 2,
        resetTimeout: 100,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe(CircuitBreakerStates.HALF_OPEN);

      // Fail in HALF_OPEN state
      await expect(
        breaker.execute(async () => {
          throw new Error('Still failing');
        })
      ).rejects.toThrow('Still failing');

      // Circuit should be OPEN again
      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);
    }, 10000);
  });

  describe('Success/Failure Tracking', () => {
    it('should track consecutive failures', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 5,
      });

      // Execute 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      const stats = breaker.getStats();
      expect(stats.failures).toBe(3);
      expect(stats.state).toBe(CircuitBreakerStates.CLOSED);
    });

    it('should reset failure count after success', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 5,
      });

      // Execute 2 failures
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      let stats = breaker.getStats();
      expect(stats.failures).toBe(2);

      // Execute success
      await breaker.execute(async () => 'success');

      stats = breaker.getStats();
      expect(stats.failures).toBe(0); // Reset after success
      expect(stats.successes).toBeGreaterThan(0);
    });

    it('should track total requests', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 10,
      });

      // Execute mix of success and failures
      await breaker.execute(async () => 'success');
      await expect(
        breaker.execute(async () => {
          throw new Error('Failure');
        })
      ).rejects.toThrow();
      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(3);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should protect database from cascading failures', async () => {
      const breaker = new CircuitBreaker({
        name: 'database',
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      let dbCallCount = 0;
      const flakeyDbQuery = async () => {
        dbCallCount++;
        throw new Error('Database connection timeout');
      };

      // First 3 attempts trigger failures and open circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(flakeyDbQuery)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);

      // Next attempts fail fast without calling database
      const callCountBeforeFastFail = dbCallCount;
      for (let i = 0; i < 5; i++) {
        await expect(breaker.execute(flakeyDbQuery)).rejects.toThrow('Circuit breaker is OPEN');
      }

      // Database should not have been called (fail fast)
      expect(dbCallCount).toBe(callCountBeforeFastFail);
    });

    it('should handle async operations with timeouts', async () => {
      const breaker = new CircuitBreaker({
        name: 'slow-service',
        failureThreshold: 2,
        timeout: 100, // 100ms timeout
      });

      // Fast operation succeeds
      const fastResult = await breaker.execute(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'fast';
      });
      expect(fastResult).toBe('fast');

      // Slow operation times out
      await expect(
        breaker.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return 'slow';
        })
      ).rejects.toThrow('Operation timed out');
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle synchronous errors', async () => {
      const breaker = new CircuitBreaker({
        name: 'sync-service',
        failureThreshold: 3,
      });

      await expect(
        breaker.execute(async () => {
          throw new Error('Sync error');
        })
      ).rejects.toThrow('Sync error');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should handle promise rejections', async () => {
      const breaker = new CircuitBreaker({
        name: 'promise-service',
        failureThreshold: 3,
      });

      await expect(
        breaker.execute(async () => Promise.reject(new Error('Rejected')))
      ).rejects.toThrow('Rejected');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should respect custom failure threshold', async () => {
      const breaker = new CircuitBreaker({
        name: 'custom-threshold',
        failureThreshold: 10,
      });

      // Execute 9 failures - should stay CLOSED
      for (let i = 0; i < 9; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      expect(breaker.getState()).toBe(CircuitBreakerStates.CLOSED);

      // 10th failure opens circuit
      await expect(
        breaker.execute(async () => {
          throw new Error('Failure');
        })
      ).rejects.toThrow('Failure');

      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);
    });

    it('should respect custom reset timeout', async () => {
      const breaker = new CircuitBreaker({
        name: 'custom-timeout',
        failureThreshold: 2,
        resetTimeout: 50, // Very short timeout
      });

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          breaker.execute(async () => {
            throw new Error('Failure');
          })
        ).rejects.toThrow('Failure');
      }

      expect(breaker.getState()).toBe(CircuitBreakerStates.OPEN);

      // Wait for custom timeout
      await new Promise((resolve) => setTimeout(resolve, 75));

      // Should be HALF_OPEN
      expect(breaker.getState()).toBe(CircuitBreakerStates.HALF_OPEN);
    }, 10000);
  });
});
