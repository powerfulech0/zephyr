const logger = require('../config/logger.js');
const { handleChangePollState } = require('./events/changePollState.js');
const handleJoinRoom = require('./events/joinRoom.js');
const handleSubmitVote = require('./events/submitVote.js');
const { PARTICIPANT_LEFT } = require('../../../shared/eventTypes.js');
const {
  websocketConnectionsCurrent,
  websocketConnectionsTotal,
  websocketMessagesTotal,
} = require('../services/metricsService.js');

/**
 * Initialize Socket.io connection handler
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {PollService} pollService - Poll service instance
 */
function initializeSocketHandler(io, pollService) {
  io.on('connection', (socket) => {
    // Track WebSocket connection metrics (T065)
    websocketConnectionsCurrent.inc();
    websocketConnectionsTotal.inc();

    logger.info({ socketId: socket.id }, 'Socket connected');

    // Register event handlers
    handleChangePollState(socket, pollService, io);
    handleJoinRoom(socket, pollService, io);
    handleSubmitVote(socket, pollService, io);

    // Handle simple room join (for testing and host joining)
    socket.on('join', (roomCode) => {
      socket.join(roomCode);
      logger.info({ socketId: socket.id, roomCode }, 'Socket joined room');
    });

    // Handle participant disconnection
    // Marks participant as disconnected in database (supports reconnection)
    socket.on('disconnect', async () => {
      try {
        // Track WebSocket disconnection metrics (T065)
        websocketConnectionsCurrent.dec();

        logger.info({ socketId: socket.id }, 'Socket disconnected');

        // Mark participant as disconnected in database (preserves data for reconnection)
        const participant = await pollService.handleDisconnect(socket.id);

        if (participant) {
          // Get updated participant count
          const participants = await pollService.getParticipants(participant.poll_id, true);

          // Broadcast participant-left event to room
          io.to(socket.data?.roomCode || '').emit(PARTICIPANT_LEFT, {
            nickname: participant.nickname,
            count: participants.length,
            timestamp: new Date().toISOString(),
          });

          logger.info(
            {
              socketId: socket.id,
              participantId: participant.id,
              nickname: participant.nickname,
              remainingCount: participants.length,
            },
            'Participant marked as disconnected and broadcast sent'
          );
        }
      } catch (error) {
        logger.error(
          { socketId: socket.id, error: error.message },
          'Error handling disconnect'
        );
      }
    });
  });
}

module.exports = initializeSocketHandler;
