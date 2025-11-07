const express = require('express');
const { validatePollCreation, validateRoomCode } = require('../middleware/validator.js');

const router = express.Router();

/**
 * Initialize poll routes with PollManager instance
 */
function initializePollRoutes(pollManager) {
  /**
   * POST /api/polls - Create a new poll
   */
  router.post('/polls', validatePollCreation, (req, res) => {
    const { question, options } = req.body;

    // Create poll with request socket as host (for HTTP, use a placeholder)
    // The actual host socket ID will be set when they connect via WebSocket
    const hostSocketId = `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const poll = pollManager.createPoll(question, options, hostSocketId);

    // Return sanitized poll data (hide internal implementation details)
    res.status(201).json({
      success: true,
      poll: {
        roomCode: poll.roomCode,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        createdAt: poll.createdAt,
      },
    });
  });

  /**
   * GET /api/polls/:roomCode - Get poll by room code
   */
  router.get('/polls/:roomCode', validateRoomCode, (req, res) => {
    const { roomCode } = req.params;

    const poll = pollManager.getPoll(roomCode);
    if (!poll) {
      return res.status(404).json({
        success: false,
        error: 'Poll not found',
      });
    }

    // Return sanitized poll data (hide internal implementation details)
    return res.status(200).json({
      success: true,
      poll: {
        roomCode: poll.roomCode,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        participantCount: poll.participants.size,
        createdAt: poll.createdAt,
      },
    });
  });

  return router;
}

module.exports = { initializePollRoutes };
