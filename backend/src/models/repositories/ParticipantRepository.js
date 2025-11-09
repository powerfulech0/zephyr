const logger = require('../../config/logger');

/**
 * ParticipantRepository - Data access layer for participants table
 * Handles all database operations for participant entities
 */
class ParticipantRepository {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Add a new participant to a poll
   * @param {Object} participantData - Participant data
   * @param {number} participantData.pollId - Poll ID
   * @param {string} participantData.nickname - Participant nickname (unique per poll)
   * @param {string} participantData.socketId - Socket.io connection ID
   * @returns {Promise<Object>} Created participant object
   */
  async addParticipant({ pollId, nickname, socketId }) {
    try {
      const result = await this.db.query(
        `INSERT INTO participants (poll_id, nickname, socket_id, is_connected)
         VALUES ($1, $2, $3, true)
         RETURNING id, poll_id, nickname, socket_id, joined_at, last_seen_at, is_connected`,
        [pollId, nickname, socketId]
      );

      const participant = result.rows[0];
      logger.info(
        { participantId: participant.id, pollId, nickname },
        'Participant added to database'
      );

      return {
        id: participant.id,
        pollId: participant.poll_id,
        nickname: participant.nickname,
        socketId: participant.socket_id,
        joinedAt: participant.joined_at,
        lastSeenAt: participant.last_seen_at,
        isConnected: participant.is_connected,
      };
    } catch (error) {
      // Check for unique constraint violation (duplicate nickname in poll)
      if (error.code === '23505') {
        // PostgreSQL unique violation error code
        logger.warn({ pollId, nickname }, 'Nickname already taken in poll');
        const err = new Error('Nickname already taken');
        err.code = 'NICKNAME_TAKEN';
        throw err;
      }

      logger.error({ error: error.message, pollId, nickname }, 'Failed to add participant');
      throw error;
    }
  }

  /**
   * Get all participants for a poll
   * @param {number} pollId - Poll ID
   * @param {boolean} connectedOnly - Only return connected participants (default: false)
   * @returns {Promise<Array>} Array of participant objects
   */
  async getParticipantsByPoll(pollId, connectedOnly = false) {
    try {
      const query = connectedOnly
        ? 'SELECT * FROM participants WHERE poll_id = $1 AND is_connected = true ORDER BY joined_at'
        : 'SELECT * FROM participants WHERE poll_id = $1 ORDER BY joined_at';

      const result = await this.db.query(query, [pollId]);

      logger.debug({ pollId, count: result.rows.length, connectedOnly }, 'Retrieved participants');

      return result.rows.map((p) => ({
        id: p.id,
        pollId: p.poll_id,
        nickname: p.nickname,
        socketId: p.socket_id,
        joinedAt: p.joined_at,
        lastSeenAt: p.last_seen_at,
        isConnected: p.is_connected,
      }));
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to retrieve participants');
      throw error;
    }
  }

  /**
   * Find participant by nickname in a specific poll
   * @param {number} pollId - Poll ID
   * @param {string} nickname - Participant nickname
   * @returns {Promise<Object|null>} Participant object or null
   */
  async getParticipantByNickname(pollId, nickname) {
    try {
      const result = await this.db.query(
        'SELECT * FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, nickname]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const p = result.rows[0];
      return {
        id: p.id,
        pollId: p.poll_id,
        nickname: p.nickname,
        socketId: p.socket_id,
        joinedAt: p.joined_at,
        lastSeenAt: p.last_seen_at,
        isConnected: p.is_connected,
      };
    } catch (error) {
      logger.error({ error: error.message, pollId, nickname }, 'Failed to find participant');
      throw error;
    }
  }

  /**
   * Find participant by socket ID
   * @param {string} socketId - Socket.io connection ID
   * @returns {Promise<Object|null>} Participant object or null
   */
  async getParticipantBySocketId(socketId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM participants WHERE socket_id = $1',
        [socketId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const p = result.rows[0];
      return {
        id: p.id,
        pollId: p.poll_id,
        nickname: p.nickname,
        socketId: p.socket_id,
        joinedAt: p.joined_at,
        lastSeenAt: p.last_seen_at,
        isConnected: p.is_connected,
      };
    } catch (error) {
      logger.error({ error: error.message, socketId }, 'Failed to find participant by socket ID');
      throw error;
    }
  }

  /**
   * Update socket ID for reconnecting participant
   * Used when participant reconnects with same nickname
   * @param {number} participantId - Participant ID
   * @param {string} newSocketId - New socket.io connection ID
   * @returns {Promise<Object>} Updated participant
   */
  async updateSocketId(participantId, newSocketId) {
    try {
      const result = await this.db.query(
        `UPDATE participants
         SET socket_id = $1, is_connected = true, last_seen_at = NOW()
         WHERE id = $2
         RETURNING id, nickname, socket_id, is_connected`,
        [newSocketId, participantId]
      );

      if (result.rows.length === 0) {
        throw new Error('Participant not found');
      }

      const participant = result.rows[0];
      logger.info(
        { participantId: participant.id, nickname: participant.nickname, newSocketId },
        'Participant socket ID updated (reconnection)'
      );

      return participant;
    } catch (error) {
      logger.error(
        { error: error.message, participantId, newSocketId },
        'Failed to update socket ID'
      );
      throw error;
    }
  }

  /**
   * Mark participant as disconnected
   * @param {string} socketId - Socket.io connection ID
   * @returns {Promise<Object|null>} Updated participant or null
   */
  async markDisconnected(socketId) {
    try {
      const result = await this.db.query(
        `UPDATE participants
         SET is_connected = false, socket_id = NULL, last_seen_at = NOW()
         WHERE socket_id = $1
         RETURNING id, nickname, poll_id`,
        [socketId]
      );

      if (result.rows.length === 0) {
        logger.debug({ socketId }, 'No participant found for disconnect');
        return null;
      }

      const participant = result.rows[0];
      logger.info(
        { participantId: participant.id, nickname: participant.nickname, socketId },
        'Participant marked as disconnected'
      );

      return participant;
    } catch (error) {
      logger.error({ error: error.message, socketId }, 'Failed to mark participant disconnected');
      throw error;
    }
  }

  /**
   * Update last_seen_at timestamp for participant activity tracking
   * @param {number} participantId - Participant ID
   * @returns {Promise<void>}
   */
  async updateLastSeen(participantId) {
    try {
      await this.db.query(
        'UPDATE participants SET last_seen_at = NOW() WHERE id = $1',
        [participantId]
      );
    } catch (error) {
      logger.error({ error: error.message, participantId }, 'Failed to update last_seen_at');
      throw error;
    }
  }

  /**
   * Mark stale participants as disconnected (cleanup job)
   * @param {number} inactiveMinutes - Minutes of inactivity threshold (default: 30)
   * @returns {Promise<number>} Count of participants marked as disconnected
   */
  async markStaleParticipantsDisconnected(inactiveMinutes = 30) {
    try {
      const result = await this.db.query(
        `UPDATE participants
         SET is_connected = false, socket_id = NULL
         WHERE is_connected = true
         AND last_seen_at < NOW() - INTERVAL '${inactiveMinutes} minutes'
         RETURNING id`,
      );

      if (result.rows.length > 0) {
        logger.info(
          { count: result.rows.length, inactiveMinutes },
          'Marked stale participants as disconnected'
        );
      }

      return result.rows.length;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to mark stale participants disconnected');
      throw error;
    }
  }
}

module.exports = ParticipantRepository;
