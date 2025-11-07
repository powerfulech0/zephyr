const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');
const config = require('./config/index.js');
const logger = require('./config/logger.js');
const PollManager = require('./models/PollManager.js');
const healthRoutes = require('./api/routes/healthRoutes.js');
const initializeSocketHandler = require('./sockets/socketHandler.js');
const errorHandler = require('./api/middleware/errorHandler.js');

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

// Initialize PollManager (singleton for MVP)
const pollManager = new PollManager();

// Middleware
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.use('/api', healthRoutes);

// Socket.io handler
initializeSocketHandler(io, pollManager);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  httpServer.listen(config.port, () => {
    logger.info({ port: config.port }, 'Server listening');
    logger.info('Socket.io ready');
  });
}

// Export for testing
module.exports = { app, httpServer, io, pollManager };
