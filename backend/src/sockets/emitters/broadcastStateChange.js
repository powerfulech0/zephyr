const logger = require('../../config/logger.js');
const { POLL_STATE_CHANGED } = require('../../../../shared/eventTypes.js');
const { websocketMessagesTotal } = require('../../services/metricsService.js');

/**
 * Broadcast poll state change to all clients in room
 * @param {Server} io - Socket.io server instance
 * @param {string} roomCode - Room code to broadcast to
 * @param {object} poll - Updated poll object
 * @param {string} previousState - Previous state before change
 */
function broadcastStateChange(io, roomCode, poll, previousState) {
  const payload = {
    roomCode: poll.roomCode,
    newState: poll.state,
    previousState,
    timestamp: new Date().toISOString(),
  };

  logger.info(
    { roomCode, newState: poll.state, previousState },
    'Broadcasting poll-state-changed event'
  );

  io.to(roomCode).emit(POLL_STATE_CHANGED, payload);

  // Track outbound WebSocket message (T065)
  websocketMessagesTotal.labels('outbound', POLL_STATE_CHANGED).inc();
}

module.exports = { broadcastStateChange };
