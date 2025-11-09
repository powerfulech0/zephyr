const logger = require('../config/logger');

/**
 * Resilience Service (T111)
 *
 * Provides retry logic with exponential backoff for handling transient failures.
 *
 * Retryable Errors (Network/Database Transient Failures):
 * - ETIMEDOUT: Connection timeout
 * - ECONNREFUSED: Connection refused
 * - ECONNRESET: Connection reset
 * - ENOTFOUND: DNS lookup failed
 * - EPIPE: Broken pipe
 * - 08P01: PostgreSQL connection exception
 * - 53300: PostgreSQL too many connections
 *
 * Non-Retryable Errors (Application Logic Errors):
 * - 42601: PostgreSQL syntax error
 * - 23505: Unique constraint violation
 * - 23503: Foreign key violation
 * - 22P02: Invalid text representation
 * - All other application errors
 */

const DEFAULT_RETRYABLE_ERRORS = [
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EPIPE',
  '08P01', // PostgreSQL connection exception
  '53300', // PostgreSQL too many connections
];

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} func - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 5)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 100)
 * @param {number} options.maxDelay - Maximum delay cap in milliseconds (optional)
 * @param {string[]} options.retryableErrors - Error codes that trigger retry (default: DEFAULT_RETRYABLE_ERRORS)
 * @param {boolean} options.shouldLog - Enable retry attempt logging (default: false)
 * @returns {Promise<*>} Result of the function
 * @throws {Error} Last error if all attempts fail
 */
async function retryWithBackoff(func, options = {}) {
  const {
    maxAttempts = 5,
    initialDelay = 100,
    maxDelay = null,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    shouldLog = false,
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const result = await func();
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = retryableErrors.includes(error.code);

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt >= maxAttempts) {
        if (shouldLog && !isRetryable) {
          logger.warn(
            {
              error: error.message,
              code: error.code,
              attempt,
            },
            'Non-retryable error encountered'
          );
        }
        throw error;
      }

      // Calculate exponential backoff delay
      // Formula: initialDelay * 2^(attempt - 1)
      // Examples: 100ms, 200ms, 400ms, 800ms, 1600ms, ...
      let delay = initialDelay * Math.pow(2, attempt - 1);

      // Apply max delay cap if specified
      if (maxDelay && delay > maxDelay) {
        delay = maxDelay;
      }

      if (shouldLog) {
        logger.warn(
          {
            error: error.message,
            code: error.code,
            attempt,
            maxAttempts,
            delayMs: delay,
          },
          `Retrying after transient failure (attempt ${attempt}/${maxAttempts})`
        );
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but throw last error just in case
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error object
 * @param {string[]} retryableErrors - Array of retryable error codes
 * @returns {boolean}
 */
function isRetryableError(error, retryableErrors = DEFAULT_RETRYABLE_ERRORS) {
  return retryableErrors.includes(error.code);
}

module.exports = {
  retryWithBackoff,
  isRetryableError,
  DEFAULT_RETRYABLE_ERRORS,
};
