/**
 * Infrastructure availability checks for integration tests
 * Allows tests to gracefully skip when dependencies are unavailable
 */

const { Pool } = require('pg');
const Redis = require('ioredis');

/**
 * Check if PostgreSQL is available
 * @param {boolean} verbose - Log errors for debugging
 * @returns {Promise<boolean>}
 */
async function isPostgresAvailable(verbose = false) {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'zephyr_test',
    user: process.env.DB_USER || 'zephyr',
    password: process.env.DB_PASSWORD || 'zephyr_test_password',
    connectionTimeoutMillis: 2000,
  };

  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    if (verbose) {
      console.error('PostgreSQL connection failed:', error.message);
      console.error('Config:', { ...config, password: '***' });
    }
    await pool.end().catch(() => {});
    return false;
  }
}

/**
 * Check if Redis is available
 * @param {boolean} verbose - Log errors for debugging
 * @returns {Promise<boolean>}
 */
async function isRedisAvailable(verbose = false) {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  };

  const redis = new Redis(config);

  // Suppress ioredis error events during health check
  redis.on('error', () => {});

  try {
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    if (verbose) {
      console.error('Redis connection failed:', error.message);
      console.error('Config:', config);
    }
    await redis.quit().catch(() => {});
    return false;
  }
}

/**
 * Skip test if PostgreSQL is not available
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function
 */
function itRequiresPostgres(testName, testFn, timeout) {
  it(testName, async () => {
    const available = await isPostgresAvailable();
    if (!available) {
      console.warn(`⚠️  Skipping test "${testName}" - PostgreSQL not available`);
      return;
    }
    await testFn();
  }, timeout);
}

/**
 * Skip test if Redis is not available
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function
 */
function itRequiresRedis(testName, testFn, timeout) {
  it(testName, async () => {
    const available = await isRedisAvailable();
    if (!available) {
      console.warn(`⚠️  Skipping test "${testName}" - Redis not available`);
      return;
    }
    await testFn();
  }, timeout);
}

/**
 * Skip test if both PostgreSQL and Redis are not available
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function
 */
function itRequiresInfrastructure(testName, testFn, timeout) {
  it(testName, async () => {
    const [postgresAvailable, redisAvailable] = await Promise.all([
      isPostgresAvailable(),
      isRedisAvailable(),
    ]);

    if (!postgresAvailable || !redisAvailable) {
      const missing = [];
      if (!postgresAvailable) missing.push('PostgreSQL');
      if (!redisAvailable) missing.push('Redis');
      console.warn(`⚠️  Skipping test "${testName}" - ${missing.join(', ')} not available`);
      return;
    }

    await testFn();
  }, timeout);
}

/**
 * Wait for PostgreSQL to be ready with retries
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>}
 */
async function waitForPostgres(maxAttempts = 30, delayMs = 1000) {
  console.log(`⏳ Waiting for PostgreSQL (max ${maxAttempts * delayMs / 1000}s)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const available = await isPostgresAvailable(attempt === maxAttempts); // verbose on last attempt

    if (available) {
      console.log(`✅ PostgreSQL ready after ${attempt} attempt(s) (${attempt * delayMs / 1000}s)`);
      return true;
    }

    // Log progress every 10 attempts
    if (attempt % 10 === 0 && attempt < maxAttempts) {
      console.log(`   Still waiting... (attempt ${attempt}/${maxAttempts})`);
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.error(`❌ PostgreSQL not ready after ${maxAttempts} attempts (${maxAttempts * delayMs / 1000}s)`);
  return false;
}

/**
 * Wait for Redis to be ready with retries
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>}
 */
async function waitForRedis(maxAttempts = 30, delayMs = 1000) {
  console.log(`⏳ Waiting for Redis (max ${maxAttempts * delayMs / 1000}s)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const available = await isRedisAvailable(attempt === maxAttempts); // verbose on last attempt

    if (available) {
      console.log(`✅ Redis ready after ${attempt} attempt(s) (${attempt * delayMs / 1000}s)`);
      return true;
    }

    // Log progress every 10 attempts
    if (attempt % 10 === 0 && attempt < maxAttempts) {
      console.log(`   Still waiting... (attempt ${attempt}/${maxAttempts})`);
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.error(`❌ Redis not ready after ${maxAttempts} attempts (${maxAttempts * delayMs / 1000}s)`);
  return false;
}

module.exports = {
  isPostgresAvailable,
  isRedisAvailable,
  itRequiresPostgres,
  itRequiresRedis,
  itRequiresInfrastructure,
  waitForPostgres,
  waitForRedis,
};
