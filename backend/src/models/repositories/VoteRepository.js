const logger = require('../../config/logger');

/**
 * VoteRepository - Data access layer for votes table
 * Handles all database operations for vote entities
 */
class VoteRepository {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Submit or update a vote (upsert pattern)
   * One vote per participant - updates if already exists
   * @param {Object} voteData - Vote submission data
   * @param {number} voteData.participantId - Participant ID
   * @param {number} voteData.optionIndex - Zero-based option index (0-4)
   * @returns {Promise<Object>} Vote object
   */
  async submitVote({ participantId, optionIndex }) {
    try {
      const result = await this.db.query(
        `INSERT INTO votes (participant_id, option_index, voted_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (participant_id)
         DO UPDATE SET option_index = EXCLUDED.option_index, updated_at = NOW()
         RETURNING id, participant_id, option_index, voted_at, updated_at`,
        [participantId, optionIndex]
      );

      const vote = result.rows[0];
      const isUpdate = vote.voted_at.getTime() !== vote.updated_at.getTime();

      logger.info(
        {
          voteId: vote.id,
          participantId: vote.participant_id,
          optionIndex: vote.option_index,
          action: isUpdate ? 'updated' : 'created',
        },
        `Vote ${isUpdate ? 'updated' : 'submitted'}`
      );

      return {
        id: vote.id,
        participantId: vote.participant_id,
        optionIndex: vote.option_index,
        votedAt: vote.voted_at,
        updatedAt: vote.updated_at,
      };
    } catch (error) {
      logger.error(
        { error: error.message, participantId, optionIndex },
        'Failed to submit vote'
      );
      throw error;
    }
  }

  /**
   * Get all votes for a specific poll
   * @param {number} pollId - Poll ID
   * @returns {Promise<Array>} Array of vote objects with participant info
   */
  async getVotesByPoll(pollId) {
    try {
      const result = await this.db.query(
        `SELECT v.id, v.participant_id, v.option_index, v.voted_at, v.updated_at,
                p.nickname
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         ORDER BY v.voted_at`,
        [pollId]
      );

      logger.debug({ pollId, count: result.rows.length }, 'Retrieved votes for poll');

      return result.rows.map((v) => ({
        id: v.id,
        participantId: v.participant_id,
        optionIndex: v.option_index,
        votedAt: v.voted_at,
        updatedAt: v.updated_at,
        nickname: v.nickname,
      }));
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to retrieve votes');
      throw error;
    }
  }

  /**
   * Get vote counts aggregated by option index for a poll
   * @param {number} pollId - Poll ID
   * @returns {Promise<Object>} Object mapping option index to count
   */
  async getVoteCountsByPoll(pollId) {
    try {
      const result = await this.db.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index
         ORDER BY v.option_index`,
        [pollId]
      );

      logger.debug({ pollId, optionCount: result.rows.length }, 'Retrieved vote counts');

      // Convert array to object: { "0": 5, "1": 3, "2": 7 }
      const voteCounts = {};
      result.rows.forEach((row) => {
        voteCounts[row.option_index] = parseInt(row.count, 10);
      });

      return voteCounts;
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to retrieve vote counts');
      throw error;
    }
  }

  /**
   * Get vote for a specific participant
   * @param {number} participantId - Participant ID
   * @returns {Promise<Object|null>} Vote object or null if no vote
   */
  async getVoteByParticipant(participantId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM votes WHERE participant_id = $1',
        [participantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const v = result.rows[0];
      return {
        id: v.id,
        participantId: v.participant_id,
        optionIndex: v.option_index,
        votedAt: v.voted_at,
        updatedAt: v.updated_at,
      };
    } catch (error) {
      logger.error({ error: error.message, participantId }, 'Failed to retrieve participant vote');
      throw error;
    }
  }

  /**
   * Get vote statistics for a poll (total votes, percentages)
   * @param {number} pollId - Poll ID
   * @returns {Promise<Object>} Vote statistics
   */
  async getVoteStatistics(pollId) {
    try {
      // Get total vote count
      const totalResult = await this.db.query(
        `SELECT COUNT(*) as total
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1`,
        [pollId]
      );

      const totalVotes = parseInt(totalResult.rows[0].total, 10);

      // Get counts by option
      const countsResult = await this.db.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index
         ORDER BY v.option_index`,
        [pollId]
      );

      // Calculate percentages
      const statistics = {
        totalVotes,
        voteCounts: {},
        percentages: {},
      };

      countsResult.rows.forEach((row) => {
        const count = parseInt(row.count, 10);
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

        statistics.voteCounts[row.option_index] = count;
        statistics.percentages[row.option_index] = Math.round(percentage * 100) / 100; // 2 decimal places
      });

      logger.debug({ pollId, totalVotes }, 'Calculated vote statistics');

      return statistics;
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to calculate vote statistics');
      throw error;
    }
  }

  /**
   * Delete all votes for a poll (used for cleanup/testing)
   * @param {number} pollId - Poll ID
   * @returns {Promise<number>} Number of votes deleted
   */
  async deleteVotesByPoll(pollId) {
    try {
      const result = await this.db.query(
        `DELETE FROM votes v
         USING participants p
         WHERE v.participant_id = p.id AND p.poll_id = $1
         RETURNING v.id`,
        [pollId]
      );

      if (result.rows.length > 0) {
        logger.info({ pollId, count: result.rows.length }, 'Deleted votes for poll');
      }

      return result.rows.length;
    } catch (error) {
      logger.error({ error: error.message, pollId }, 'Failed to delete votes');
      throw error;
    }
  }
}

module.exports = VoteRepository;
