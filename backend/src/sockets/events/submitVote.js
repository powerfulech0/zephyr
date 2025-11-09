const logger = require('../../config/logger.js');
const { SUBMIT_VOTE } = require('../../../../shared/eventTypes.js');
const broadcastVoteUpdate = require('../emitters/broadcastVoteUpdate.js');
const { websocketMessagesTotal } = require('../../services/metricsService.js');

/**
 * Handle vote submission from participants
 * Validates poll state, participant membership, and option index
 * Persists vote to database and broadcasts vote-update event
 */
function handleSubmitVote(socket, pollService, io) {
  socket.on(SUBMIT_VOTE, async (data, callback) => {
    // Track inbound WebSocket message (T065)
    websocketMessagesTotal.labels('inbound', SUBMIT_VOTE).inc();

    try {
      const { roomCode, participantId, optionIndex } = data;

      // Validate required fields
      if (roomCode === undefined || participantId === undefined || optionIndex === undefined) {
        const error = 'Missing required fields: roomCode, participantId, and optionIndex';
        logger.warn({ socketId: socket.id, data }, error);
        if (callback) callback({ success: false, error });
        return;
      }

      // Submit vote via service (handles validation and persistence)
      const voteStatistics = await pollService.submitVote(roomCode, participantId, optionIndex);

      logger.info(
        { socketId: socket.id, roomCode, participantId, optionIndex },
        'Vote recorded and persisted'
      );

      // Broadcast updated vote counts to all clients in room
      broadcastVoteUpdate(io, roomCode, voteStatistics.voteCounts, voteStatistics.percentages);

      // Send acknowledgment
      if (callback) {
        callback({ success: true, voteStatistics });
      }
    } catch (error) {
      logger.error(
        { socketId: socket.id, error: error.message, data },
        'Failed to submit vote'
      );

      if (callback) {
        let errorMessage = 'Failed to submit vote';
        if (error.code === 'POLL_NOT_FOUND') {
          errorMessage = 'Poll not found';
        } else if (error.code === 'POLL_NOT_OPEN') {
          errorMessage = error.message;
        } else if (error.code === 'INVALID_OPTION') {
          errorMessage = error.message;
        }

        callback({
          success: false,
          error: errorMessage,
        });
      }
    }
  });
}

module.exports = handleSubmitVote;
