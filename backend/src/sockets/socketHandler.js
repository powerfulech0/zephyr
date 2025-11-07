const logger = require('../config/logger.js');

/**
 * Initialize Socket.io connection handler
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {PollManager} pollManager - Poll manager instance
 */
function initializeSocketHandler(io, pollManager) {
  io.on('connection', socket => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    // Event handlers will be registered here in future tasks
    // This is the main connection handler that will be extended

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });
}

module.exports = initializeSocketHandler;
