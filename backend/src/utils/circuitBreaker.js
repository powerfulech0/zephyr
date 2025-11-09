const logger = require('../config/logger');

/**
 * Circuit Breaker Utility (T112)
 *
 * Implements the Circuit Breaker pattern to prevent cascading failures.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, reject all requests (fail fast)
 * - HALF_OPEN: Test if service recovered, allow limited requests
 *
 * Transitions:
 * CLOSED -> OPEN: When failure count exceeds threshold
 * OPEN -> HALF_OPEN: After reset timeout expires
 * HALF_OPEN -> CLOSED: After success threshold met
 * HALF_OPEN -> OPEN: If any failure occurs
 */

const CircuitBreakerStates = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  /**
   * Create a circuit breaker
   * @param {Object} options - Configuration options
   * @param {string} options.name - Circuit breaker name (for logging)
   * @param {number} options.failureThreshold - Number of failures before opening (default: 5)
   * @param {number} options.successThreshold - Number of successes to close from HALF_OPEN (default: 2)
   * @param {number} options.resetTimeout - Milliseconds before trying HALF_OPEN (default: 30000)
   * @param {number} options.timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(options = {}) {
    this.name = options.name || 'unnamed';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.timeout = options.timeout || 10000; // 10 seconds

    this.state = CircuitBreakerStates.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0; // For HALF_OPEN threshold tracking
    this.totalRequests = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    logger.debug(
      {
        name: this.name,
        failureThreshold: this.failureThreshold,
        resetTimeout: this.resetTimeout,
      },
      'Circuit breaker initialized'
    );
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} func - Async function to execute
   * @returns {Promise<*>} Result of the function
   * @throws {Error} If circuit is open or function fails
   */
  async execute(func) {
    this.totalRequests++;

    // Check if we should transition to HALF_OPEN
    if (this.state === CircuitBreakerStates.OPEN && this.shouldAttemptReset()) {
      this.state = CircuitBreakerStates.HALF_OPEN;
      this.consecutiveSuccesses = 0;
      logger.info({ name: this.name }, 'Circuit breaker transitioning to HALF_OPEN');
    }

    // Reject immediately if circuit is OPEN
    if (this.state === CircuitBreakerStates.OPEN) {
      const error = new Error('Circuit breaker is OPEN');
      error.code = 'CIRCUIT_BREAKER_OPEN';
      logger.warn(
        {
          name: this.name,
          state: this.state,
          failures: this.failures,
        },
        'Circuit breaker rejecting request (fail fast)'
      );
      throw error;
    }

    try {
      // Execute function with timeout
      const result = await this.executeWithTimeout(func);

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error);

      throw error;
    }
  }

  /**
   * Execute function with timeout
   * @param {Function} func - Async function to execute
   * @returns {Promise<*>} Result of the function
   */
  async executeWithTimeout(func) {
    if (!this.timeout) {
      return await func();
    }

    return Promise.race([
      func(),
      new Promise((_, reject) =>
        setTimeout(() => {
          const error = new Error('Operation timed out');
          error.code = 'ETIMEDOUT';
          reject(error);
        }, this.timeout)
      ),
    ]);
  }

  /**
   * Handle successful request
   */
  onSuccess() {
    this.failures = 0; // Reset failure count
    this.successes++; // Track total successes

    if (this.state === CircuitBreakerStates.HALF_OPEN) {
      this.consecutiveSuccesses++;

      // Close circuit if success threshold met
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.state = CircuitBreakerStates.CLOSED;
        this.consecutiveSuccesses = 0;
        logger.info(
          {
            name: this.name,
            successThreshold: this.successThreshold,
          },
          'Circuit breaker CLOSED after successful recovery'
        );
      }
    }
  }

  /**
   * Handle failed request
   * @param {Error} error - The error that occurred
   */
  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();

    logger.warn(
      {
        name: this.name,
        error: error.message,
        failures: this.failures,
        threshold: this.failureThreshold,
      },
      'Circuit breaker recorded failure'
    );

    if (this.state === CircuitBreakerStates.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens circuit
      this.state = CircuitBreakerStates.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.warn(
        {
          name: this.name,
          resetTimeout: this.resetTimeout,
        },
        'Circuit breaker reopened from HALF_OPEN'
      );
    } else if (this.state === CircuitBreakerStates.CLOSED) {
      // Open circuit if failure threshold exceeded
      if (this.failures >= this.failureThreshold) {
        this.state = CircuitBreakerStates.OPEN;
        this.nextAttemptTime = Date.now() + this.resetTimeout;
        logger.error(
          {
            name: this.name,
            failures: this.failures,
            threshold: this.failureThreshold,
          },
          'Circuit breaker OPENED due to failures'
        );
      }
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   * @returns {boolean}
   */
  shouldAttemptReset() {
    return this.nextAttemptTime && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Get current circuit breaker state
   * @returns {string} Current state
   */
  getState() {
    // Auto-transition to HALF_OPEN if enough time has passed
    if (this.state === CircuitBreakerStates.OPEN && this.shouldAttemptReset()) {
      this.state = CircuitBreakerStates.HALF_OPEN;
      this.consecutiveSuccesses = 0;
      logger.info({ name: this.name }, 'Circuit breaker transitioning to HALF_OPEN');
    }

    return this.state;
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker (for testing/recovery)
   */
  reset() {
    this.state = CircuitBreakerStates.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    logger.info({ name: this.name }, 'Circuit breaker manually reset');
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerStates,
};
