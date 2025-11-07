const logger = require('../../config/logger.js');
const { CHANGE_POLL_STATE } = require('../../../../shared/eventTypes.js');
const { broadcastStateChange } = require('../emitters/broadcastStateChange.js');

/**
 * Handle change-poll-state Socket.io event
 * Only the host can change poll state
 */
function handleChangePollState(socket, pollManager, io) {
  socket.on(CHANGE_POLL_STATE, (data, callback) => {
    const { roomCode, newState } = data;

    logger.info(
      { socketId: socket.id, roomCode, newState },
      'Received change-poll-state event'
    );

    // Validate required fields
    if (!roomCode || !newState) {
      const error = 'Missing required fields: roomCode and newState';
      logger.warn({ socketId: socket.id, data }, error);
      if (callback) callback({ success: false, error });
      return;
    }

    // Attempt to change poll state
    const result = pollManager.changePollState(roomCode, newState, socket.id);

    if (!result.success) {
      logger.warn({ socketId: socket.id, roomCode, error: result.error }, 'State change failed');
      if (callback) callback(result);
      return;
    }

    logger.info(
      { socketId: socket.id, roomCode, previousState: result.previousState, newState },
      'Poll state changed successfully'
    );

    // Broadcast state change to all clients in room
    broadcastStateChange(io, roomCode, result.poll, result.previousState);

    // Send acknowledgment to host
    if (callback) {
      callback({
        success: true,
        poll: result.poll,
        previousState: result.previousState,
      });
    }
  });
}

module.exports = { handleChangePollState };
