const Redis = require('ioredis');
const logger = require('./logger');
const { CircuitBreaker } = require('../utils/circuitBreaker');

let redisClient = null;
let redisCircuitBreaker = null;

/**
 * Initialize Redis client with retry strategy
 * @returns {Redis} Redis client instance
 */
function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, max 5 attempts
      if (times > 5) {
        logger.error('Redis connection failed after 5 attempts');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 800);
      logger.warn({ attempt: times, delay }, 'Redis connection retry');
      return delay;
    },
  };

  redisClient = new Redis(config);

  // Event listeners
  redisClient.on('connect', () => {
    logger.info(
      {
        host: config.host,
        port: config.port,
      },
      'Redis connection established'
    );
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', (delay) => {
    logger.info({ delay }, 'Redis reconnecting');
  });

  // Initialize circuit breaker for Redis (T116)
  redisCircuitBreaker = new CircuitBreaker({
    name: 'redis',
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000, // 30 seconds
    timeout: 5000, // 5 second operation timeout
  });

  logger.info(
    {
      host: config.host,
      port: config.port,
    },
    'Redis client initialized with circuit breaker protection'
  );

  return redisClient;
}

/**
 * Get the Redis client instance
 * @returns {Redis} Redis client
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection gracefully
 * @returns {Promise<void>}
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
    redisClient = null;
  }
}

/**
 * Check if Redis is connected and healthy
 * @returns {Promise<boolean>}
 */
async function isHealthy() {
  if (!redisClient) {
    return false;
  }

  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ error: error.message }, 'Redis health check failed');
    return false;
  }
}

/**
 * Execute Redis operation with circuit breaker protection (T114, T116)
 * @param {Function} operation - Redis operation function
 * @returns {Promise<*>} Result of the operation
 * @example
 * await executeRedisOperation(async () => await redis.get('key'));
 */
async function executeRedisOperation(operation) {
  if (!redisCircuitBreaker) {
    // Fallback if circuit breaker not initialized (e.g., in tests)
    return await operation();
  }

  return await redisCircuitBreaker.execute(operation);
}

/**
 * Get the Redis circuit breaker instance (for monitoring)
 * @returns {CircuitBreaker|null}
 */
function getRedisCircuitBreaker() {
  return redisCircuitBreaker;
}

module.exports = {
  initializeRedis,
  getRedisClient,
  getRedis: getRedisClient, // Alias for backward compatibility
  closeRedis,
  isHealthy,
  executeRedisOperation,
  getRedisCircuitBreaker,
};
