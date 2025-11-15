const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');

const config = require('./config/index.js');
const logger = require('./config/logger.js');
const correlationIdMiddleware = require('./api/middleware/correlationId.js');
const securityHeaders = require('./api/middleware/securityHeaders.js');
const { globalRateLimiter } = require('./api/middleware/rateLimiter.js');
const metricsMiddleware = require('./api/middleware/metricsMiddleware.js');
const healthRoutes = require('./api/routes/healthRoutes.js');
const metricsRoutes = require('./api/routes/metricsRoutes.js');
const configRoutes = require('./api/routes/configRoutes.js');
const errorHandler = require('./api/middleware/errorHandler.js');
const { initializeInfrastructure } = require('./utils/initializeInfrastructure.js');
const { gracefulShutdown } = require('./utils/gracefulShutdown.js');

// Parse allowed origins from environment variable (comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Application Core
let app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(securityHeaders);
app.use(correlationIdMiddleware);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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

// Error handler (must be last)
app.use(errorHandler);

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', httpServer, io));
process.on('SIGINT', () => gracefulShutdown('SIGINT', httpServer, io));

// PollService will be initialized after database connection
let pollService;

// Start server
if (require.main === module) {
  initializeInfrastructure(io, app)
    .then(resp => {
      pollService = resp.pollService;
      app = resp.app;

      httpServer.listen(config.port, () => {
        logger.info({ port: config.port }, 'Server listening');
      });
    })
    .catch(error => {
      logger.error({ error: error.message }, 'Server startup failed');
      process.exit(1);
    });
}

// Export for testing
module.exports = { app, httpServer, io, pollService, initializeInfrastructure };
