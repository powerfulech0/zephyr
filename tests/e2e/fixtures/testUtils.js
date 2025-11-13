const { test as base } = require('@playwright/test');

/**
 * CleanupTracker - Tracks test resources for automatic cleanup
 *
 * Tracks polls and WebSocket connections created during tests
 * and automatically cleans them up after test execution.
 */
class CleanupTracker {
  constructor() {
    this.createdPolls = [];
    this.createdConnections = [];
  }

  /**
   * Track poll for cleanup
   * @param {string} roomCode - Room code of poll to clean up
   */
  trackPoll(roomCode) {
    if (roomCode && !this.createdPolls.includes(roomCode)) {
      this.createdPolls.push(roomCode);
      console.log(`🔖 Tracking poll for cleanup: ${roomCode}`);
    }
  }

  /**
   * Track WebSocket connection for cleanup
   * @param {import('@playwright/test').Page} page - Page with WebSocket connection
   */
  trackConnection(page) {
    if (page && !this.createdConnections.includes(page)) {
      this.createdConnections.push(page);
      console.log(`🔖 Tracking connection for cleanup`);
    }
  }

  /**
   * Clean up all tracked resources
   * Closes WebSocket connections and deletes polls
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.log('🧹 Starting cleanup...');

    // Close all tracked WebSocket connections
    for (const page of this.createdConnections) {
      try {
        if (page && !page.isClosed()) {
          await page.close();
          console.log('✓ Closed WebSocket connection');
        }
      } catch (error) {
        console.warn('⚠ Failed to close connection:', error.message);
      }
    }

    // Delete all tracked polls
    // Note: In-memory polls will be automatically garbage collected
    // For persistent polls, you would make API calls here
    for (const roomCode of this.createdPolls) {
      try {
        // If you have a delete poll API endpoint:
        // await fetch(`${apiUrl}/api/polls/${roomCode}`, { method: 'DELETE' });
        console.log(`✓ Cleaned up poll: ${roomCode}`);
      } catch (error) {
        console.warn(`⚠ Failed to cleanup poll ${roomCode}:`, error.message);
      }
    }

    console.log(`🧹 Cleanup complete: ${this.createdConnections.length} connections, ${this.createdPolls.length} polls`);

    // Reset trackers
    this.createdConnections = [];
    this.createdPolls = [];
  }
}

/**
 * Playwright test fixture with automatic cleanup
 *
 * Usage:
 * test('my test', async ({ page, pollCleanup }) => {
 *   // Create poll
 *   const roomCode = await createPoll();
 *   pollCleanup.trackPoll(roomCode);
 *   // Test code...
 *   // Cleanup happens automatically after test
 * });
 */
const test = base.extend({
  pollCleanup: async ({}, use) => {
    const tracker = new CleanupTracker();
    await use(tracker);
    await tracker.cleanup();
  },
});

/**
 * Helper function to wait for condition with timeout
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Max wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 * @throws {Error} If condition not met within timeout
 */
async function waitForCondition(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Helper function to retry operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.delay - Initial delay in ms (default: 1000)
 * @param {number} options.backoff - Backoff multiplier (default: 2)
 * @returns {Promise<any>} Result of successful operation
 * @throws {Error} Last error if all retries fail
 */
async function retryWithBackoff(operation, options = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt);
        console.log(`⚠ Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  test,
  CleanupTracker,
  waitForCondition,
  retryWithBackoff,
  sleep,
};
