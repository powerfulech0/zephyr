const express = require('express');
const { validatePollCreation, validateRoomCode } = require('../middleware/validator.js');
const { pollCreationRateLimiter } = require('../middleware/rateLimiter.js');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * Initialize poll routes with PollService instance
 */
function initializePollRoutes(pollService) {
  /**
   * POST /api/polls - Create a new poll
   * Rate limited: 5 requests per hour per IP
   */
  router.post('/polls', pollCreationRateLimiter, validatePollCreation, async (req, res) => {
    try {
      const { question, options } = req.body;

      // Create poll via service (handles database persistence)
      const poll = await pollService.createPoll({ question, options });

      logger.info({ roomCode: poll.roomCode }, 'Poll created via API');

      // Return sanitized poll data
      res.status(201).json({
        roomCode: poll.roomCode,
        question: poll.question,
        options: poll.options,
        state: poll.state,
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create poll via API');
      res.status(500).json({
        error: 'Failed to create poll',
      });
    }
  });

  /**
   * GET /api/polls/:roomCode - Get poll by room code
   */
  router.get('/polls/:roomCode', validateRoomCode, async (req, res) => {
    try {
      const { roomCode } = req.params;

      // Get poll with details (participants, votes) from database
      const poll = await pollService.getPollWithDetails(roomCode);

      if (!poll) {
        return res.status(404).json({
          error: 'Poll not found',
        });
      }

      logger.debug({ roomCode }, 'Poll retrieved via API');

      // Return sanitized poll data
      return res.status(200).json({
        roomCode: poll.roomCode,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        participantCount: poll.participantCount,
        votes: poll.votes,
        percentages: poll.percentages,
      });
    } catch (error) {
      logger.error({ error: error.message, roomCode: req.params.roomCode }, 'Failed to retrieve poll via API');
      return res.status(500).json({
        error: 'Failed to retrieve poll',
      });
    }
  });

  return router;
}

module.exports = { initializePollRoutes };
