const logger = require('../config/logger.js');
const { handleChangePollState } = require('./events/changePollState.js');

/**
 * Initialize Socket.io connection handler
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {PollManager} pollManager - Poll manager instance
 */
function initializeSocketHandler(io, pollManager) {
  io.on('connection', socket => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    // Register event handlers
    handleChangePollState(socket, pollManager, io);

    // Handle simple room join (for testing and host joining)
    socket.on('join', roomCode => {
      socket.join(roomCode);
      logger.info({ socketId: socket.id, roomCode }, 'Socket joined room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
      // Clean up participant on disconnect
      const result = pollManager.removeParticipant(socket.id);
      if (result) {
        logger.info(
          { socketId: socket.id, roomCode: result.roomCode, cleared: result.cleared },
          'Participant removed on disconnect'
        );
      }
    });
  });
}

module.exports = initializeSocketHandler;
