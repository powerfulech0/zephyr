const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');
const config = require('./config/index.js');
const logger = require('./config/logger.js');
const { initializePool, closePool, getPool } = require('./config/database.js');
const { initializeRedis, closeRedis } = require('./config/cache.js');
const correlationIdMiddleware = require('./api/middleware/correlationId.js');
const PollService = require('./services/pollService.js');
const healthRoutes = require('./api/routes/healthRoutes.js');
const { initializePollRoutes } = require('./api/routes/pollRoutes.js');
const initializeSocketHandler = require('./sockets/socketHandler.js');
const errorHandler = require('./api/middleware/errorHandler.js');

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// PollService will be initialized after database connection
let pollService;

// Middleware
app.use(correlationIdMiddleware); // Add correlation ID to all requests
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(pinoHttp({ logger }));

/**
 * Initialize infrastructure connections (database, Redis)
 * @returns {Promise<void>}
 */
async function initializeInfrastructure() {
  try {
    // Initialize database connection pool
    initializePool();
    logger.info('Database connection pool initialized');

    // Initialize Redis client
    initializeRedis();
    logger.info('Redis client initialized');

    // Initialize PollService with database pool
    const dbPool = getPool();
    pollService = new PollService(dbPool);
    logger.info('PollService initialized');

    // Restore active polls from database on startup (zero data loss)
    const activePolls = await pollService.restoreActivePolls();
    logger.info({ count: activePolls.length }, 'Active polls restored from database');

    // Initialize routes and socket handlers with pollService
    app.use('/api', healthRoutes);
    app.use('/api', initializePollRoutes(pollService));
    initializeSocketHandler(io, pollService);

    return true;
  } catch (error) {
    logger.error({ error: error.message }, 'Infrastructure initialization failed');
    throw error;
  }
}

// Error handler (must be last)
app.use(errorHandler);

/**
 * Graceful shutdown handler
 * Closes all connections before process termination (FR-027)
 */
async function gracefulShutdown(signal) {
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

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
if (require.main === module) {
  initializeInfrastructure()
    .then(() => {
      httpServer.listen(config.port, () => {
        logger.info({ port: config.port }, 'Server listening');
        logger.info('Socket.io ready');
        logger.info('Production-ready infrastructure initialized');
      });
    })
    .catch((error) => {
      logger.error({ error: error.message }, 'Server startup failed');
      process.exit(1);
    });
}

// Export for testing
module.exports = { app, httpServer, io, pollService, initializeInfrastructure };
