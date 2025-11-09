const logger = require('../../config/logger');

/**
 * PollRepository - Data access layer for polls table
 * Handles all database operations for poll entities
 */
class PollRepository {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Create a new poll in the database
   * @param {Object} pollData - Poll creation data
   * @param {string} pollData.roomCode - Unique 6-character room code
   * @param {string} pollData.question - Poll question (5-200 chars)
   * @param {Array<string>} pollData.options - Array of 2-5 answer options
   * @param {string} pollData.state - Initial state (default: 'waiting')
   * @returns {Promise<Object>} Created poll object
   */
  async createPoll({ roomCode, question, options, state = 'waiting' }) {
    try {
      const result = await this.db.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code, question, options, state, created_at, expires_at, is_active`,
        [roomCode, question, JSON.stringify(options), state]
      );

      const poll = result.rows[0];
      logger.info({ pollId: poll.id, roomCode: poll.room_code }, 'Poll created in database');

      return {
        id: poll.id,
        roomCode: poll.room_code,
        question: poll.question,
        options: poll.options, // Already parsed by pg driver
        state: poll.state,
        createdAt: poll.created_at,
        expiresAt: poll.expires_at,
        isActive: poll.is_active,
      };
    } catch (error) {
      logger.error({ error: error.message, roomCode }, 'Failed to create poll');
      throw error;
    }
  }

  /**
   * Retrieve a poll by room code
   * @param {string} roomCode - Room code to lookup
   * @param {boolean} includeInactive - Whether to include soft-deleted polls (default: false)
   * @returns {Promise<Object|null>} Poll object or null if not found
   */
  async getPollByRoomCode(roomCode, includeInactive = false) {
    try {
      const query = includeInactive
        ? 'SELECT * FROM polls WHERE room_code = $1'
        : 'SELECT * FROM polls WHERE room_code = $1 AND is_active = true';

      const result = await this.db.query(query, [roomCode]);

      if (result.rows.length === 0) {
        logger.debug({ roomCode }, 'Poll not found');
        return null;
      }

      const poll = result.rows[0];
      logger.debug({ pollId: poll.id, roomCode }, 'Poll retrieved from database');

      return {
        id: poll.id,
        roomCode: poll.room_code,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        createdAt: poll.created_at,
        expiresAt: poll.expires_at,
        isActive: poll.is_active,
      };
    } catch (error) {
      logger.error({ error: error.message, roomCode }, 'Failed to retrieve poll');
      throw error;
    }
  }

  /**
   * Retrieve a poll by ID
   * @param {number} pollId - Poll ID
   * @returns {Promise<Object|null>} Poll object or null if not found
   */
  async getPollById(pollId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM polls WHERE id = $1 AND is_active = true',
        [pollId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const poll = result.rows[0];
      return {
        id: poll.id,
        roomCode: poll.room_code,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        createdAt: poll.created_at,
        expiresAt: poll.expires_at,
        isActive: poll.is_active,
      };
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to retrieve poll by ID');
      throw error;
    }
  }

  /**
   * Update poll state (waiting -> open -> closed)
   * @param {string} roomCode - Room code of poll to update
   * @param {string} newState - New state ('waiting', 'open', 'closed')
   * @returns {Promise<Object|null>} Updated poll or null if not found
   */
  async updatePollState(roomCode, newState) {
    try {
      const result = await this.db.query(
        `UPDATE polls
         SET state = $1
         WHERE room_code = $2 AND is_active = true
         RETURNING id, room_code, state`,
        [newState, roomCode]
      );

      if (result.rows.length === 0) {
        logger.warn({ roomCode, newState }, 'Poll not found for state update');
        return null;
      }

      const poll = result.rows[0];
      logger.info(
        { pollId: poll.id, roomCode: poll.room_code, newState },
        'Poll state updated'
      );

      return poll;
    } catch (error) {
      logger.error({ error: error.message, roomCode, newState }, 'Failed to update poll state');
      throw error;
    }
  }

  /**
   * Soft delete (expire) old polls
   * Sets is_active = false for polls past their expiration date
   * @returns {Promise<Array>} Array of expired poll IDs
   */
  async expireOldPolls() {
    try {
      const result = await this.db.query(
        `UPDATE polls
         SET is_active = false
         WHERE expires_at < NOW() AND is_active = true
         RETURNING id, room_code, expires_at`
      );

      if (result.rows.length > 0) {
        const expiredIds = result.rows.map((row) => row.id);
        logger.info(
          { count: result.rows.length, pollIds: expiredIds },
          'Expired old polls (soft delete)'
        );
      }

      return result.rows;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to expire old polls');
      throw error;
    }
  }

  /**
   * Get all active polls (for server startup restoration)
   * @returns {Promise<Array>} Array of active poll objects
   */
  async getAllActivePolls() {
    try {
      const result = await this.db.query(
        'SELECT * FROM polls WHERE is_active = true ORDER BY created_at DESC'
      );

      logger.info({ count: result.rows.length }, 'Retrieved all active polls');

      return result.rows.map((poll) => ({
        id: poll.id,
        roomCode: poll.room_code,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        createdAt: poll.created_at,
        expiresAt: poll.expires_at,
        isActive: poll.is_active,
      }));
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to retrieve active polls');
      throw error;
    }
  }

  /**
   * Get poll with full details (participants, votes, counts)
   * @param {string} roomCode - Room code
   * @returns {Promise<Object|null>} Poll with aggregated data or null
   */
  async getPollWithDetails(roomCode) {
    try {
      const result = await this.db.query(
        `SELECT
          p.id, p.room_code, p.question, p.options, p.state, p.created_at,
          COUNT(DISTINCT part.id) FILTER (WHERE part.is_connected) AS participant_count,
          COALESCE(
            json_object_agg(
              v.option_index, vote_counts.count
            ) FILTER (WHERE v.option_index IS NOT NULL),
            '{}'::json
          ) AS votes
         FROM polls p
         LEFT JOIN participants part ON part.poll_id = p.id
         LEFT JOIN votes v ON v.participant_id = part.id
         LEFT JOIN (
           SELECT v2.participant_id, v2.option_index, COUNT(*) as count
           FROM votes v2
           JOIN participants p2 ON v2.participant_id = p2.id
           GROUP BY v2.participant_id, v2.option_index
         ) vote_counts ON vote_counts.participant_id = part.id
         WHERE p.room_code = $1 AND p.is_active = true
         GROUP BY p.id`,
        [roomCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const poll = result.rows[0];
      return {
        id: poll.id,
        roomCode: poll.room_code,
        question: poll.question,
        options: poll.options,
        state: poll.state,
        createdAt: poll.created_at,
        participantCount: parseInt(poll.participant_count, 10),
        votes: poll.votes,
      };
    } catch (error) {
      logger.error({ error: error.message, roomCode }, 'Failed to get poll with details');
      throw error;
    }
  }
}

module.exports = PollRepository;
