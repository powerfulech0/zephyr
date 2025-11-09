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
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
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
