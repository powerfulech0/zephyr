/**
 * Jest global setup - runs once before all test suites
 * Waits for required infrastructure (PostgreSQL, Redis) to be ready in CI
 */

const { waitForPostgres, waitForRedis } = require('./helpers/infrastructure');

module.exports = async () => {
  const isCi = process.env.CI === 'true';

  if (isCi) {
    console.log('\n🔄 CI environment detected - waiting for infrastructure...\n');

    const startTime = Date.now();

    // Wait for services in parallel with generous timeout
    const [postgresReady, redisReady] = await Promise.all([
      waitForPostgres(60, 1000), // 60 seconds max (1 sec intervals)
      waitForRedis(60, 1000),     // 60 seconds max (1 sec intervals)
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!postgresReady) {
      console.error('\n❌ PostgreSQL not available after 60s - integration/contract tests will fail\n');
      console.error('Connection details:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
      });
    }

    if (!redisReady) {
      console.error('\n❌ Redis not available after 60s - integration/contract tests may fail\n');
      console.error('Connection details:', {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      });
    }

    if (postgresReady && redisReady) {
      console.log(`\n✅ All infrastructure services ready (${elapsed}s)\n`);
    } else {
      console.warn('\n⚠️  Some services not ready - tests requiring infrastructure will fail\n');
    }
  }
};
