/**
 * Network Simulation Helpers
 *
 * Purpose: Simulate network conditions for testing error handling and resilience
 *
 * Functions:
 * - simulateDisconnection: Simulate network disconnection
 * - simulateSlowNetwork: Simulate slow network conditions
 * - simulateBackendFailure: Simulate backend error responses
 * - waitForReconnection: Wait for WebSocket reconnection after network issue
 */

/**
 * Simulate network disconnection by setting page context offline
 *
 * @param {Page} page - Playwright page instance
 * @param {number} duration - Duration in milliseconds to stay offline
 * @returns {Promise<void>}
 *
 * @example
 * await simulateDisconnection(page, 2000); // Offline for 2 seconds
 */
async function simulateDisconnection(page, duration = 1000) {
  console.log(`Simulating network disconnection for ${duration}ms`);

  await page.context().setOffline(true);
  await page.waitForTimeout(duration);
  await page.context().setOffline(false);

  console.log('Network connection restored');
}

/**
 * Simulate slow network conditions
 *
 * @param {Page} page - Playwright page instance
 * @param {Object} options - Network throttling options
 * @param {number} options.downloadThroughput - Download speed in bytes/sec (default: 50KB/s)
 * @param {number} options.uploadThroughput - Upload speed in bytes/sec (default: 50KB/s)
 * @param {number} options.latency - Latency in milliseconds (default: 200ms)
 * @returns {Promise<void>}
 *
 * @example
 * await simulateSlowNetwork(page, { latency: 500, downloadThroughput: 10000 });
 */
async function simulateSlowNetwork(page, options = {}) {
  const defaultOptions = {
    downloadThroughput: 50 * 1024, // 50 KB/s
    uploadThroughput: 50 * 1024, // 50 KB/s
    latency: 200, // 200ms latency
  };

  const throttlingOptions = { ...defaultOptions, ...options };

  console.log('Simulating slow network:', throttlingOptions);

  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: throttlingOptions.downloadThroughput,
    uploadThroughput: throttlingOptions.uploadThroughput,
    latency: throttlingOptions.latency,
  });
}

/**
 * Restore normal network conditions
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 *
 * @example
 * await restoreNetworkConditions(page);
 */
async function restoreNetworkConditions(page) {
  console.log('Restoring normal network conditions');

  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  });
}

/**
 * Simulate backend failure by intercepting API requests and returning error responses
 *
 * @param {Page} page - Playwright page instance
 * @param {string} urlPattern - URL pattern to intercept (e.g., "/api/polls", "**/vote")
 * @param {number} statusCode - HTTP status code to return (default: 500)
 * @param {Object} errorBody - Error response body (default: {error: "Internal Server Error"})
 * @returns {Promise<void>}
 *
 * @example
 * await simulateBackendFailure(page, '**/vote', 500, { error: 'Vote failed' });
 */
async function simulateBackendFailure(page, urlPattern, statusCode = 500, errorBody = { error: 'Internal Server Error' }) {
  console.log(`Simulating backend failure for ${urlPattern} with status ${statusCode}`);

  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify(errorBody),
    });
  });
}

/**
 * Remove backend failure simulation and restore normal request handling
 *
 * @param {Page} page - Playwright page instance
 * @param {string} urlPattern - URL pattern to stop intercepting (must match the pattern used in simulateBackendFailure)
 * @returns {Promise<void>}
 *
 * @example
 * await restoreBackendRequests(page, '**/vote');
 */
async function restoreBackendRequests(page, urlPattern) {
  console.log(`Restoring normal backend requests for ${urlPattern}`);

  await page.unroute(urlPattern);
}

/**
 * Wait for WebSocket reconnection after network issue
 *
 * @param {Page} page - Playwright page instance
 * @param {number} timeout - Maximum time to wait for reconnection in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - Returns true if reconnected, false if timeout
 *
 * @example
 * const reconnected = await waitForReconnection(page, 5000);
 */
async function waitForReconnection(page, timeout = 5000) {
  console.log(`Waiting for WebSocket reconnection (timeout: ${timeout}ms)`);

  try {
    // Wait for Socket.io reconnection event
    await page.waitForFunction(
      () => {
        // Check if Socket.io client is connected
        return window.socket && window.socket.connected === true;
      },
      { timeout }
    );

    console.log('WebSocket reconnected successfully');
    return true;
  } catch (error) {
    console.log('WebSocket reconnection timeout');
    return false;
  }
}

/**
 * Simulate session expiration by clearing storage and cookies
 *
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 *
 * @example
 * await simulateSessionExpiration(page);
 */
async function simulateSessionExpiration(page) {
  console.log('Simulating session expiration');

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log('Session storage and cookies cleared');
}

module.exports = {
  simulateDisconnection,
  simulateSlowNetwork,
  restoreNetworkConditions,
  simulateBackendFailure,
  restoreBackendRequests,
  waitForReconnection,
  simulateSessionExpiration,
};
