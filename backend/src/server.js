const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');
const cron = require('node-cron');
const config = require('./config/index.js');
const logger = require('./config/logger.js');
const { initializePool, closePool, getPool } = require('./config/database.js');
const { initializeRedis, closeRedis } = require('./config/cache.js');
const correlationIdMiddleware = require('./api/middleware/correlationId.js');
const securityHeaders = require('./api/middleware/securityHeaders.js');
const { globalRateLimiter } = require('./api/middleware/rateLimiter.js');
const metricsMiddleware = require('./api/middleware/metricsMiddleware.js');
const PollService = require('./services/pollService.js');
const healthRoutes = require('./api/routes/healthRoutes.js');
const metricsRoutes = require('./api/routes/metricsRoutes.js');
const authRoutes = require('./api/routes/authRoutes.js');
const configRoutes = require('./api/routes/configRoutes.js');
const { initializePollRoutes } = require('./api/routes/pollRoutes.js');
const initializeSocketHandler = require('./sockets/socketHandler.js');
const { configureRedisAdapter } = require('./sockets/adapter.js');
const errorHandler = require('./api/middleware/errorHandler.js');
const { executePollCleanup } = require('./jobs/pollCleanup.js');
const { executeAuditLogCleanup } = require('./jobs/auditLogCleanup.js');
const { executeParticipantCleanup } = require('./jobs/participantCleanup.js');

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

// Parse allowed origins from environment variable (comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Middleware - Order matters!
// 1. Security headers (must be first)
app.use(securityHeaders);

// 2. Correlation ID tracking
app.use(correlationIdMiddleware);

// 3. CORS configuration with environment-based origins (T044)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 4. Request size limits (T045) - 100kb max
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. HTTP request logging
app.use(pinoHttp({ logger }));

// 6. Global rate limiting (T043) - 100 requests per 15 minutes
app.use(globalRateLimiter);

// 7. Metrics instrumentation (T064) - Track HTTP request metrics
app.use(metricsMiddleware);

// 8. Register routes that don't require database/Redis (always available)
app.use('/', metricsRoutes); // Metrics at /metrics (not /api/metrics)
app.use('/api', healthRoutes); // Health checks (always available)
app.use('/api/config', configRoutes); // Runtime configuration (T078-T080)

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

    // Configure Socket.io Redis adapter for multi-instance support (T097, T098)
    configureRedisAdapter(io);
    logger.info('Socket.io Redis adapter configured');

    // Initialize PollService with database pool
    const dbPool = getPool();
    pollService = new PollService(dbPool);
    logger.info('PollService initialized');

    // Restore active polls from database on startup (zero data loss)
    const activePolls = await pollService.restoreActivePolls();
    logger.info({ count: activePolls.length }, 'Active polls restored from database');

    // Initialize scheduled cleanup jobs (T137-T142)
    if (process.env.CLEANUP_ENABLED !== 'false') {
      const retentionDays = parseInt(process.env.POLL_RETENTION_DAYS || '30', 10);
      const auditRetentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);
      const participantTimeoutMinutes = parseInt(
        process.env.PARTICIPANT_TIMEOUT_MINUTES || '30',
        10,
      );

      // Poll cleanup: Daily at 2am
      cron.schedule('0 2 * * *', async () => {
        logger.info('Running scheduled poll cleanup job');
        try {
          await executePollCleanup();
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled poll cleanup failed');
        }
      });

      // Audit log cleanup: Weekly on Sunday at 3am
      cron.schedule('0 3 * * 0', async () => {
        logger.info('Running scheduled audit log cleanup job');
        try {
          await executeAuditLogCleanup(auditRetentionDays);
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled audit log cleanup failed');
        }
      });

      // Participant cleanup: Hourly
      cron.schedule('0 * * * *', async () => {
        logger.debug('Running scheduled participant cleanup job');
        try {
          await executeParticipantCleanup(participantTimeoutMinutes);
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled participant cleanup failed');
        }
      });

      logger.info(
        {
          pollRetentionDays: retentionDays,
          auditRetentionDays,
          participantTimeoutMinutes,
        },
        'Scheduled cleanup jobs initialized',
      );
    } else {
      logger.info('Cleanup jobs disabled via CLEANUP_ENABLED=false');
    }

    // Initialize routes and socket handlers with pollService
    app.use('/api/auth', authRoutes); // Authentication routes (T054)
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
