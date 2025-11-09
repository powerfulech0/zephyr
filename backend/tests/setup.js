// Jest setup file - runs before all tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Set default test database configuration if not provided
if (!process.env.DB_HOST) process.env.DB_HOST = 'localhost';
if (!process.env.DB_PORT) process.env.DB_PORT = '5432';
if (!process.env.DB_NAME) process.env.DB_NAME = 'zephyr_test';
if (!process.env.DB_USER) process.env.DB_USER = 'zephyr';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'zephyr_test_password';

if (!process.env.REDIS_HOST) process.env.REDIS_HOST = 'localhost';
if (!process.env.REDIS_PORT) process.env.REDIS_PORT = '6379';

// Increase default timeout for tests that need infrastructure
jest.setTimeout(10000);
