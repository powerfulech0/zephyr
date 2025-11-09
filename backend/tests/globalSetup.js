/**
 * Jest global setup - runs once before all test suites
 * Waits for required infrastructure (PostgreSQL, Redis) to be ready in CI
 */

const { waitForPostgres, waitForRedis } = require('./helpers/infrastructure');

module.exports = async () => {
  const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  if (isCi) {
    console.log('\n🔄 CI environment detected - waiting for infrastructure...');
    console.log('Environment:', {
      CI: process.env.CI,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || '5432',
      DB_NAME: process.env.DB_NAME || 'zephyr_test',
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: process.env.REDIS_PORT || '6379',
    });
    console.log('');

    const startTime = Date.now();

    // Wait for services in parallel with generous timeout
    const [postgresReady, redisReady] = await Promise.all([
      waitForPostgres(60, 1000), // 60 seconds max (1 sec intervals)
      waitForRedis(60, 1000),     // 60 seconds max (1 sec intervals)
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(''); // Empty line for readability

    if (!postgresReady) {
      console.error('❌ PostgreSQL not available after 60s - integration/contract tests will fail');
      console.error('Connection config:', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'zephyr_test',
        user: process.env.DB_USER || 'zephyr',
      });
    }

    if (!redisReady) {
      console.error('❌ Redis not available after 60s - integration/contract tests may fail');
      console.error('Connection config:', {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      });
    }

    if (postgresReady && redisReady) {
      console.log(`✅ All infrastructure services ready (${elapsed}s)`);
    } else {
      console.warn('\n⚠️  Some services not ready - tests requiring infrastructure will fail');
      // Don't fail the setup - let individual tests fail with clear errors
    }

    console.log(''); // Empty line before tests start
  } else {
    console.log('📍 Local environment detected - skipping infrastructure wait\n');
  }
};
