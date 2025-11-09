// Jest global teardown - runs after all tests complete
// Ensures all async operations are cleaned up properly

module.exports = async () => {
  // Give a small delay for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // Clean up any remaining database connections
  try {
    const { closePool } = require('../src/config/database');
    await closePool();
  } catch (error) {
    // Database might not be initialized, that's ok
  }

  // Clean up Redis connections
  try {
    const { closeRedis } = require('../src/config/cache');
    await closeRedis();
  } catch (error) {
    // Redis might not be initialized, that's ok
  }

  // Force clear all timers
  if (global.gc) {
    global.gc();
  }
};
