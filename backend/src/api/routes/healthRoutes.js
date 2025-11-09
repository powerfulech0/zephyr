const express = require('express');
const os = require('os');
const { getPool } = require('../../config/database');
const { getRedisClient } = require('../../config/cache');
const logger = require('../../config/logger');

const router = express.Router();

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * Check database connectivity
 * @returns {Promise<Object>} Database health status
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - start;

    return {
      status: 'connected',
      responseTime,
      details: `PostgreSQL - Query successful`,
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Database health check failed');
    return {
      status: 'disconnected',
      responseTime: null,
      error: error.message,
    };
  }
}

/**
 * Check Redis connectivity
 * @returns {Promise<Object>} Redis health status
 */
async function checkRedis() {
  const start = Date.now();
  try {
    const redis = getRedisClient();
    await redis.ping();
    const responseTime = Date.now() - start;

    return {
      status: 'connected',
      responseTime,
      details: 'Redis - Ping successful',
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Redis health check failed');
    return {
      status: 'disconnected',
      responseTime: null,
      error: error.message,
    };
  }
}

/**
 * GET /api/health
 * Enhanced health check endpoint with dependency checks
 *
 * Returns 200 if all dependencies are healthy, 503 otherwise
 */
router.get('/health', async (req, res) => {
  try {
    // Check dependencies
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    // Determine overall health status
    const isHealthy = database.status === 'connected' && redis.status === 'connected';

    // Get system info
    const memory = process.memoryUsage();
    const uptime = Math.floor((Date.now() - startTime) / 1000); // seconds

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '2.0.0',
      dependencies: {
        database,
        redis,
      },
      system: {
        memory: {
          used: memory.heapUsed,
          total: memory.heapTotal,
          percentage: ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2),
        },
        cpu: {
          loadAverage: os.loadavg(),
        },
      },
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/ready
 * Readiness probe - checks if service can accept traffic
 *
 * Returns 200 if database and Redis are available, 503 otherwise
 */
router.get('/health/ready', async (req, res) => {
  try {
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    const isReady = database.status === 'connected' && redis.status === 'connected';

    const response = {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: database.status,
        redis: redis.status,
      },
    };

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ error: error.message }, 'Readiness check failed');
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe - checks if process is alive
 *
 * Always returns 200 if the process is responsive
 */
router.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

module.exports = router;
