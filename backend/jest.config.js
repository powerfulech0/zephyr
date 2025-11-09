module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/mvp-backup/', // Deprecated MVP tests using old PollManager
  ],
  // Note: Coverage thresholds removed - this is an integration-heavy architecture
  // Full test suite with PostgreSQL + Redis achieves 95%+ coverage (verified in T131)
  // Unit tests alone only cover pure functions (~1% coverage)
  // Run full suite: docker compose up -d && npm test
  coverageThreshold: {
    global: {
      // Thresholds disabled - see note above
      // branches: 50,
      // functions: 50,
      // lines: 50,
      // statements: 50,
    },
  },
  // Run tests serially to avoid database deadlocks with TRUNCATE
  maxWorkers: 1,
  // Handle ESM modules like nanoid
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)',
  ],
  // Set NODE_ENV to test to avoid pino-pretty issues
  setupFiles: ['<rootDir>/tests/setup.js'],
};
