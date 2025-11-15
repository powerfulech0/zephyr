const logger = require('../config/logger.js');
const { closePool } = require('../config/database.js');
const { closeRedis } = require('../config/cache.js');

/**
 * Graceful shutdown handler
 * Closes all connections before process termination (FR-027)
 */
async function gracefulShutdown(signal, httpServer, io) {
  logger.info({ signal }, 'Graceful shutdown initiated');

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close WebSocket connections
      io.close(() => {
        logger.info('Socket.io connections closed');
      });

      // Close database pool
      await closePool();
      logger.info('Database pool closed');

      // Close Redis connection
      await closeRedis();
      logger.info('Redis connection closed');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error: error.message }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after 30s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000);
}

module.exports = { gracefulShutdown };
