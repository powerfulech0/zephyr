const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedis } = require('../config/cache');
const logger = require('../config/logger');

/**
 * Configure Socket.io Redis Adapter for Multi-Instance Broadcasting (T097)
 *
 * The Redis adapter enables Socket.io to broadcast messages across multiple
 * backend instances. When a message is emitted on one instance, it's published
 * to Redis, and all other instances receive it and broadcast to their clients.
 *
 * Architecture:
 * - Each backend instance creates two Redis clients (pub/sub)
 * - Publisher sends messages to Redis when broadcasting
 * - Subscriber receives messages from Redis and emits to local clients
 * - Supports rooms, namespaces, and all Socket.io features
 *
 * @param {Server} io - Socket.io server instance
 * @returns {void}
 */
function configureRedisAdapter(io) {
  try {
    const redisClient = getRedis();

    if (!redisClient || !redisClient.status || redisClient.status !== 'ready') {
      logger.warn('Redis client not ready, skipping Socket.io adapter setup');
      logger.warn('Multi-instance WebSocket support will NOT work without Redis adapter');
      return;
    }

    // Create duplicate clients for pub/sub
    // Socket.io Redis adapter needs dedicated connections
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    // Configure the adapter
    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Socket.io Redis adapter configured for multi-instance support');

    // Handle Redis adapter errors
    io.of('/').adapter.on('error', (error) => {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
        },
        'Socket.io Redis adapter error'
      );
    });

    // Log adapter connection status
    pubClient.on('connect', () => {
      logger.debug('Redis adapter publisher connected');
    });

    subClient.on('connect', () => {
      logger.debug('Redis adapter subscriber connected');
    });

    pubClient.on('error', (error) => {
      logger.error(
        {
          error: error.message,
        },
        'Redis adapter publisher error'
      );
    });

    subClient.on('error', (error) => {
      logger.error(
        {
          error: error.message,
        },
        'Redis adapter subscriber error'
      );
    });
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
      },
      'Failed to configure Socket.io Redis adapter'
    );

    // Don't throw - fall back to default adapter (in-memory)
    // This allows single-instance deployments to work without Redis
    logger.warn('Falling back to in-memory adapter (single-instance only)');
  }
}

/**
 * Get adapter statistics for monitoring
 * @param {Server} io - Socket.io server instance
 * @returns {Object} Adapter statistics
 */
function getAdapterStats(io) {
  const adapter = io.of('/').adapter;

  return {
    rooms: adapter.rooms.size,
    sockets: adapter.sids.size,
    usingRedis: adapter.constructor.name === 'RedisAdapter',
  };
}

module.exports = {
  configureRedisAdapter,
  getAdapterStats,
};
