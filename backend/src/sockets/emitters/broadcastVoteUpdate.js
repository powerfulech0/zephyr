const logger = require('../../config/logger.js');
const { VOTE_UPDATE } = require('../../../../shared/eventTypes.js');

/**
 * Broadcast vote count updates to all clients in a room
 * Emits vote-update event with current vote counts and percentages
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {string} roomCode - Poll room code
 * @param {number[]} votes - Array of vote counts per option
 * @param {number[]} percentages - Array of vote percentages per option
 */
function broadcastVoteUpdate(io, roomCode, votes, percentages) {
  const payload = {
    votes,
    percentages,
    timestamp: new Date().toISOString(),
  };

  logger.info(
    { roomCode, votes, percentages },
    'Broadcasting vote-update event'
  );

  io.to(roomCode).emit(VOTE_UPDATE, payload);
}

module.exports = broadcastVoteUpdate;
