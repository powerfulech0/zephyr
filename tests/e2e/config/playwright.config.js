const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for Zephyr E2E Tests
 *
 * Configures browsers, workers, timeouts, retries, and reporting
 * for end-to-end testing of the Zephyr voting application.
 */
module.exports = defineConfig({
  testDir: '../specs',

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI only
  workers: process.env.CI ? 2 : 1, // Parallel workers (2 in CI, 1 local)

  // Reporting
  reporter: process.env.CI
    ? [['html'], ['json', { outputFile: '../reports/test-results.json' }]]
    : [['html'], ['list']],

  // Global timeout settings
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },

  // Shared settings for all tests
  use: {
    // Base URL for frontend (from environment or default)
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Browser settings
    headless: process.env.HEADLESS !== 'false', // Headless in CI, configurable locally
    viewport: { width: 1280, height: 720 },

    // Artifacts on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Action timeouts
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Output directory for test artifacts
  outputDir: '../reports/test-results',

  // Web server configuration (optional - start services before tests)
  // Uncomment if you want Playwright to start backend/frontend automatically
  /*
  webServer: [
    {
      command: 'cd backend && npm start',
      port: 4000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  */
});
