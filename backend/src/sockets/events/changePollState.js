const logger = require('../../config/logger.js');
const { CHANGE_POLL_STATE } = require('../../../../shared/eventTypes.js');
const { broadcastStateChange } = require('../emitters/broadcastStateChange.js');

/**
 * Handle change-poll-state Socket.io event
 * Changes poll state and persists to database
 * Note: Host authentication is optional (added in User Story 2)
 */
function handleChangePollState(socket, pollService, io) {
  socket.on(CHANGE_POLL_STATE, async (data, callback) => {
    try {
      const { roomCode, newState } = data;

      logger.info({ socketId: socket.id, roomCode, newState }, 'Received change-poll-state event');

      // Validate required fields
      if (!roomCode || !newState) {
        const error = 'Missing required fields: roomCode and newState';
        logger.warn({ socketId: socket.id, data }, error);
        if (callback) callback({ success: false, error });
        return;
      }

      // Get current poll state before change
      const currentPoll = await pollService.getPoll(roomCode);
      if (!currentPoll) {
        logger.warn({ socketId: socket.id, roomCode }, 'Poll not found for state change');
        if (callback) {
          callback({
            success: false,
            error: 'Poll not found',
          });
        }
        return;
      }

      const previousState = currentPoll.state;

      // Change poll state (persists to database)
      const updatedPoll = await pollService.changePollState(roomCode, newState);

      if (!updatedPoll) {
        logger.warn({ socketId: socket.id, roomCode }, 'Failed to change poll state');
        if (callback) {
          callback({
            success: false,
            error: 'Failed to change poll state',
          });
        }
        return;
      }

      logger.info(
        { socketId: socket.id, roomCode, previousState, newState },
        'Poll state changed and persisted successfully'
      );

      // Get full poll details for broadcast
      const pollWithDetails = await pollService.getPollWithDetails(roomCode);

      // Broadcast state change to all clients in room
      broadcastStateChange(io, roomCode, pollWithDetails, previousState);

      // Send acknowledgment to host
      if (callback) {
        callback({
          success: true,
          poll: pollWithDetails,
          previousState,
        });
      }
    } catch (error) {
      logger.error(
        { socketId: socket.id, error: error.message, data },
        'Error handling change-poll-state'
      );

      if (callback) {
        callback({
          success: false,
          error: 'Failed to change poll state',
        });
      }
    }
  });
}

module.exports = { handleChangePollState };
