const logger = require('../../config/logger');

/**
 * Load Shedding Middleware
 *
 * Implements request queuing and rejection under high load to prevent
 * system overload. When the queue is full, returns 503 Service Unavailable
 * with Retry-After header.
 *
 * This middleware protects the application from being overwhelmed during
 * traffic spikes by gracefully rejecting excess requests rather than
 * degrading performance for all users.
 */

class LoadSheddingMiddleware {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.maxConcurrent = options.maxConcurrent || 100;
    this.retryAfterSeconds = options.retryAfterSeconds || 5;

    this.currentQueue = 0;
    this.currentActive = 0;
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req, res, next) => {
      // Check if we're over capacity
      if (this.currentQueue >= this.maxQueueSize) {
        logger.warn(
          { queueSize: this.currentQueue, maxQueueSize: this.maxQueueSize },
          'Load shedding: Queue full, rejecting request'
        );

        return res
          .status(503)
          .set('Retry-After', this.retryAfterSeconds.toString())
          .json({
            error: 'Service temporarily unavailable due to high load',
            retryAfter: this.retryAfterSeconds,
          });
      }

      // Add to queue
      this.currentQueue += 1;

      // Wait for available slot
      const processRequest = new Promise((resolve) => {
        const checkSlot = () => {
          if (this.currentActive < this.maxConcurrent) {
            this.currentActive += 1;
            this.currentQueue -= 1;
            resolve();
          } else {
            // Check again in 10ms
            setTimeout(checkSlot, 10);
          }
        };
        checkSlot();
      });

      try {
        await processRequest;

        // Set up cleanup on response finish
        res.on('finish', () => {
          this.currentActive -= 1;
        });

        res.on('close', () => {
          this.currentActive -= 1;
        });

        return next();
      } catch (error) {
        this.currentQueue -= 1;
        this.currentActive -= 1;
        logger.error({ error }, 'Load shedding: Error processing queued request');
        return next(error);
      }
    };
  }

  /**
   * Get current queue statistics
   */
  getStats() {
    return {
      queueSize: this.currentQueue,
      activeRequests: this.currentActive,
      maxQueueSize: this.maxQueueSize,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

module.exports = LoadSheddingMiddleware;
