const logger = require('../config/logger.js');
const { handleChangePollState } = require('./events/changePollState.js');
const handleJoinRoom = require('./events/joinRoom.js');
const handleSubmitVote = require('./events/submitVote.js');
const { PARTICIPANT_LEFT } = require('../../../shared/eventTypes.js');

/**
 * Initialize Socket.io connection handler
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {PollManager} pollManager - Poll manager instance
 */
function initializeSocketHandler(io, pollManager) {
  io.on('connection', socket => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    // Register event handlers for User Story 1 (Host)
    handleChangePollState(socket, pollManager, io);

    // Register event handlers for User Story 2 (Participant)
    handleJoinRoom(socket, pollManager, io);
    handleSubmitVote(socket, pollManager, io);

    // Handle simple room join (for testing and host joining)
    socket.on('join', roomCode => {
      socket.join(roomCode);
      logger.info({ socketId: socket.id, roomCode }, 'Socket joined room');

      // Update host socket ID when host joins via WebSocket
      const result = pollManager.updateHostSocketId(roomCode, socket.id);
      if (result.success) {
        logger.info({ socketId: socket.id, roomCode }, 'Updated host socket ID');
      }
    });

    // T081: Handle disconnect with participant cleanup and broadcast
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
      // T082: Clean up participant on disconnect
      const result = pollManager.removeParticipant(socket.id);
      if (result) {
        logger.info(
          {
            socketId: socket.id,
            roomCode: result.roomCode,
            cleared: result.cleared,
            nickname: result.nickname,
          },
          'Participant removed on disconnect'
        );

        // T083: Broadcast participant-left event if nickname was tracked
        if (result.nickname && !result.cleared) {
          const poll = pollManager.getPoll(result.roomCode);
          if (poll) {
            io.to(result.roomCode).emit(PARTICIPANT_LEFT, {
              nickname: result.nickname,
              count: poll.participants.size,
              timestamp: new Date().toISOString(),
            });
            logger.info(
              {
                roomCode: result.roomCode,
                nickname: result.nickname,
                remainingCount: poll.participants.size,
              },
              'Broadcast participant-left event'
            );
          }
        }
      }
    });
  });
}

module.exports = initializeSocketHandler;
