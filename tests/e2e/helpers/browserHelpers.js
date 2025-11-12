/**
 * Browser Testing Helpers
 *
 * Utility functions for browser interactions including waiting,
 * retrying operations, and managing multiple browser contexts.
 */

/**
 * Wait for network to become idle
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Wait options
 * @param {number} options.timeout - Max wait time in ms (default: 30000)
 * @param {number} options.idleTime - Idle duration to consider stable in ms (default: 500)
 * @returns {Promise<void>}
 * @throws {Error} If network doesn't become idle within timeout
 */
async function waitForNetworkIdle(page, options = {}) {
  const { timeout = 30000, idleTime = 500 } = options;

  try {
    await page.waitForLoadState('networkidle', { timeout });
    // Additional wait for specified idle time
    await new Promise(resolve => setTimeout(resolve, idleTime));
    console.log('✓ Network is idle');
  } catch (error) {
    throw new Error(`Network did not become idle within ${timeout}ms`);
  }
}

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.delay - Initial delay in ms (default: 1000)
 * @param {number} options.backoff - Backoff multiplier (default: 2)
 * @returns {Promise<any>} Result of successful operation
 * @throws {Error} Last error if all retries fail
 */
async function retryOperation(operation, options = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        console.log(`✓ Operation succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt);
        console.log(`⚠ Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}`);
        console.log(`  Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`✗ All ${maxRetries + 1} attempts failed`);
  throw lastError;
}

/**
 * Create multiple isolated browser contexts
 * @param {import('@playwright/test').Browser} browser - Browser instance
 * @param {number} count - Number of contexts to create
 * @param {object} contextOptions - Options for each context
 * @returns {Promise<import('@playwright/test').BrowserContext[]>} Array of browser contexts
 */
async function createMultipleContexts(browser, count, contextOptions = {}) {
  const contexts = [];

  for (let i = 0; i < count; i++) {
    const context = await browser.newContext({
      ...contextOptions,
      // Ensure each context is isolated
      locale: contextOptions.locale || 'en-US',
      timezoneId: contextOptions.timezoneId || 'America/New_York',
    });
    contexts.push(context);
  }

  console.log(`✓ Created ${count} isolated browser contexts`);
  return contexts;
}

/**
 * Close multiple browser contexts
 * @param {import('@playwright/test').BrowserContext[]} contexts - Contexts to close
 * @returns {Promise<void>}
 */
async function closeMultipleContexts(contexts) {
  for (const context of contexts) {
    try {
      await context.close();
    } catch (error) {
      console.warn('⚠ Failed to close context:', error.message);
    }
  }
  console.log(`✓ Closed ${contexts.length} browser contexts`);
}

/**
 * Wait for element to be stable (not animating)
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<void>}
 * @throws {Error} If element not stable within timeout
 */
async function waitForElementStable(page, selector, timeout = 5000) {
  const element = await page.waitForSelector(selector, { timeout });

  // Wait for element position to stabilize
  let previousBox = await element.boundingBox();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const currentBox = await element.boundingBox();

    if (
      previousBox &&
      currentBox &&
      previousBox.x === currentBox.x &&
      previousBox.y === currentBox.y &&
      previousBox.width === currentBox.width &&
      previousBox.height === currentBox.height
    ) {
      console.log(`✓ Element ${selector} is stable`);
      return;
    }

    previousBox = currentBox;
  }

  throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
}

/**
 * Scroll element into view
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} selector - CSS selector
 * @returns {Promise<void>}
 */
async function scrollIntoView(page, selector) {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, selector);
  // Wait for scroll to complete
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Take screenshot with timestamp
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} name - Screenshot name prefix
 * @returns {Promise<string>} Path to saved screenshot
 */
async function takeTimestampedScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const path = `tests/e2e/reports/screenshots/${filename}`;

  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot saved: ${path}`);
  return path;
}

/**
 * Get console logs from page
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<string[]>} Array of console messages
 */
async function getConsoleLogs(page) {
  const logs = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Return existing logs if listener already attached
  return logs;
}

/**
 * Wait for URL to match pattern
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {RegExp|string} pattern - URL pattern to match
 * @param {number} timeout - Max wait time in ms (default: 30000)
 * @returns {Promise<void>}
 * @throws {Error} If URL doesn't match within timeout
 */
async function waitForUrl(page, pattern, timeout = 30000) {
  try {
    await page.waitForURL(pattern, { timeout });
    console.log(`✓ URL matches pattern: ${pattern}`);
  } catch (error) {
    throw new Error(`URL did not match pattern ${pattern} within ${timeout}ms. Current URL: ${page.url()}`);
  }
}

/**
 * Simulate slow network conditions
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {object} options - Network throttling options
 * @param {number} options.downloadThroughput - Download speed in bytes/s
 * @param {number} options.uploadThroughput - Upload speed in bytes/s
 * @param {number} options.latency - Additional latency in ms
 * @returns {Promise<void>}
 */
async function simulateSlowNetwork(page, options = {}) {
  const {
    downloadThroughput = 50000, // 50 KB/s
    uploadThroughput = 50000,   // 50 KB/s
    latency = 1000,             // 1 second
  } = options;

  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput,
    uploadThroughput,
    latency,
  });

  console.log('🐌 Simulating slow network conditions');
}

/**
 * Simulate network disconnection
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<void>}
 */
async function simulateOffline(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
  });

  console.log('📵 Simulating offline mode');
}

/**
 * Restore normal network conditions
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<void>}
 */
async function restoreNetwork(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });

  console.log('✓ Network conditions restored');
}

module.exports = {
  waitForNetworkIdle,
  retryOperation,
  createMultipleContexts,
  closeMultipleContexts,
  waitForElementStable,
  scrollIntoView,
  takeTimestampedScreenshot,
  getConsoleLogs,
  waitForUrl,
  simulateSlowNetwork,
  simulateOffline,
  restoreNetwork,
};
