/**
 * Test Environment Configuration
 *
 * Centralized configuration for E2E test environment including
 * URLs, ports, timeouts, and test execution settings.
 */

/**
 * Get test configuration from environment variables with fallback defaults
 * @returns {TestConfig} Test configuration object
 */
function getConfig() {
  return {
    // Service URLs
    baseUrl: process.env.BASE_URL || 'http://localhost:5173',
    apiUrl: process.env.API_URL || 'http://localhost:4000',
    wsUrl: process.env.WS_URL || 'ws://localhost:4000',

    // Timeout settings (milliseconds)
    browserTimeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000, // 30s
    wsTimeout: parseInt(process.env.WS_TIMEOUT) || 2000, // 2s
    networkIdleTimeout: parseInt(process.env.NETWORK_IDLE_TIMEOUT) || 5000, // 5s

    // Test execution settings
    retryAttempts: process.env.CI ? 2 : 0,
    parallel: process.env.CI ? true : false,
    workers: process.env.CI ? 2 : 1,

    // Browser settings
    headless: process.env.HEADLESS !== 'false', // Default true
    slowMo: parseInt(process.env.SLOW_MO) || 0, // No slow-mo by default

    // Artifact settings
    recordVideo: process.env.RECORD_VIDEO === 'true', // Off by default
    screenshotOnFailure: true, // Always capture screenshots on failure

    // CI detection
    isCI: !!process.env.CI,
  };
}

/**
 * Override config for specific tests
 * @param {Partial<TestConfig>} overrides - Properties to override
 */
let configOverrides = {};
function setConfig(overrides) {
  configOverrides = { ...configOverrides, ...overrides };
}

/**
 * Get config with overrides applied
 * @returns {TestConfig} Merged configuration
 */
function getConfigWithOverrides() {
  return { ...getConfig(), ...configOverrides };
}

/**
 * Reset config overrides
 */
function resetConfig() {
  configOverrides = {};
}

/**
 * Validate URLs are properly formatted
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for services to be ready
 * @param {string[]} urls - URLs to check
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<void>}
 */
async function waitForServices(urls, timeout = 60000) {
  const waitOn = require('wait-on');
  const resources = urls.map(url => url.replace('ws://', 'tcp:'));

  try {
    await waitOn({
      resources,
      timeout,
      interval: 1000,
      window: 1000,
    });
    console.log('✓ All services ready');
  } catch (error) {
    console.error('✗ Services not ready:', error.message);
    throw new Error(`Services failed to start within ${timeout}ms`);
  }
}

module.exports = {
  getConfig,
  setConfig,
  getConfigWithOverrides,
  resetConfig,
  isValidUrl,
  waitForServices,
};

/**
 * @typedef {Object} TestConfig
 * @property {string} baseUrl - Frontend application URL
 * @property {string} apiUrl - Backend API URL
 * @property {string} wsUrl - WebSocket URL
 * @property {number} browserTimeout - Default browser operation timeout
 * @property {number} wsTimeout - WebSocket event timeout
 * @property {number} networkIdleTimeout - Network idle timeout
 * @property {number} retryAttempts - Number of retry attempts
 * @property {boolean} parallel - Enable parallel execution
 * @property {number} workers - Number of parallel workers
 * @property {boolean} headless - Run in headless mode
 * @property {number} slowMo - Slow down operations (debugging)
 * @property {boolean} recordVideo - Record test videos
 * @property {boolean} screenshotOnFailure - Capture screenshots on failure
 * @property {boolean} isCI - Running in CI environment
 */
