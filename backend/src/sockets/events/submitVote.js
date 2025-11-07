const logger = require('../../config/logger.js');
const { SUBMIT_VOTE } = require('../../../../shared/eventTypes.js');
const broadcastVoteUpdate = require('../emitters/broadcastVoteUpdate.js');

/**
 * Handle vote submission from participants
 * Validates poll state, participant membership, and option index
 * Broadcasts vote-update event with new counts to all clients in room
 */
function handleSubmitVote(socket, pollManager, io) {
  socket.on(SUBMIT_VOTE, (data, callback) => {
    const { roomCode, nickname, optionIndex } = data;

    // Validate required fields
    if (roomCode === undefined || nickname === undefined || optionIndex === undefined) {
      const error = 'Missing required fields: roomCode, nickname, and optionIndex';
      logger.warn({ socketId: socket.id, data }, error);
      if (callback) callback({ success: false, error });
      return;
    }

    // Record vote
    const result = pollManager.recordVote(roomCode, nickname, optionIndex);

    if (!result.success) {
      logger.warn(
        { socketId: socket.id, roomCode, nickname, optionIndex, error: result.error },
        'Failed to record vote'
      );
      if (callback) callback(result);
      return;
    }

    logger.info({ socketId: socket.id, roomCode, nickname, optionIndex }, 'Vote recorded');

    // Broadcast updated vote counts to all clients in room
    broadcastVoteUpdate(io, roomCode, result.votes, result.percentages);

    // Send acknowledgment
    if (callback) {
      callback({ success: true });
    }
  });
}

module.exports = handleSubmitVote;
