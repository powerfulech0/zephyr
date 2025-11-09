const PollRepository = require('../models/repositories/PollRepository');
const ParticipantRepository = require('../models/repositories/ParticipantRepository');
const VoteRepository = require('../models/repositories/VoteRepository');
const generateRoomCode = require('./roomCodeGenerator');
const logger = require('../config/logger');

/**
 * PollService - Business logic layer for poll operations
 * Orchestrates repository calls with validation and error handling
 */
class PollService {
  constructor(dbPool) {
    this.pollRepo = new PollRepository(dbPool);
    this.participantRepo = new ParticipantRepository(dbPool);
    this.voteRepo = new VoteRepository(dbPool);
  }

  /**
   * Create a new poll
   * @param {Object} pollData - Poll creation data
   * @param {string} pollData.question - Poll question
   * @param {Array<string>} pollData.options - Answer options
   * @returns {Promise<Object>} Created poll
   */
  async createPoll({ question, options }) {
    try {
      // Generate unique room code
      let roomCode;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        roomCode = generateRoomCode();
        const existing = await this.pollRepo.getPollByRoomCode(roomCode);
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique room code');
      }

      // Create poll in database
      const poll = await this.pollRepo.createPoll({
        roomCode,
        question,
        options,
        state: 'waiting',
      });

      logger.info({ pollId: poll.id, roomCode: poll.roomCode }, 'Poll created via service');

      return poll;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create poll in service');
      throw error;
    }
  }

  /**
   * Get poll by room code
   * @param {string} roomCode - Room code
   * @returns {Promise<Object|null>} Poll object or null
   */
  async getPoll(roomCode) {
    return this.pollRepo.getPollByRoomCode(roomCode);
  }

  /**
   * Get poll with full details (participants, votes, statistics)
   * @param {string} roomCode - Room code
   * @returns {Promise<Object|null>} Poll with aggregated data
   */
  async getPollWithDetails(roomCode) {
    try {
      const poll = await this.pollRepo.getPollByRoomCode(roomCode);
      if (!poll) {
        return null;
      }

      const participants = await this.participantRepo.getParticipantsByPoll(poll.id, true);
      const voteStatistics = await this.voteRepo.getVoteStatistics(poll.id);

      return {
        ...poll,
        participantCount: participants.length,
        votes: voteStatistics.voteCounts,
        percentages: voteStatistics.percentages,
        totalVotes: voteStatistics.totalVotes,
      };
    } catch (error) {
      logger.error({ error: error.message, roomCode }, 'Failed to get poll with details');
      throw error;
    }
  }

  /**
   * Change poll state (waiting -> open -> closed)
   * @param {string} roomCode - Room code
   * @param {string} newState - New state
   * @returns {Promise<Object|null>} Updated poll
   */
  async changePollState(roomCode, newState) {
    try {
      // Validate state transition
      const validStates = ['waiting', 'open', 'closed'];
      if (!validStates.includes(newState)) {
        throw new Error(`Invalid poll state: ${newState}`);
      }

      const result = await this.pollRepo.updatePollState(roomCode, newState);

      if (result) {
        logger.info({ roomCode, newState }, 'Poll state changed via service');
      }

      return result;
    } catch (error) {
      logger.error({ error: error.message, roomCode, newState }, 'Failed to change poll state');
      throw error;
    }
  }

  /**
   * Add participant to poll
   * @param {string} roomCode - Room code
   * @param {string} nickname - Participant nickname
   * @param {string} socketId - Socket.io connection ID
   * @returns {Promise<Object>} Participant object or reconnection info
   */
  async addParticipant(roomCode, nickname, socketId) {
    try {
      // Verify poll exists
      const poll = await this.pollRepo.getPollByRoomCode(roomCode);
      if (!poll) {
        const error = new Error('Poll not found');
        error.code = 'POLL_NOT_FOUND';
        throw error;
      }

      // Check if participant already exists (reconnection scenario)
      const existingParticipant = await this.participantRepo.getParticipantByNickname(
        poll.id,
        nickname
      );

      if (existingParticipant) {
        // Reconnection: update socket ID
        await this.participantRepo.updateSocketId(existingParticipant.id, socketId);

        // Get previous vote if exists
        const previousVote = await this.voteRepo.getVoteByParticipant(existingParticipant.id);

        logger.info(
          { participantId: existingParticipant.id, nickname, roomCode },
          'Participant reconnected'
        );

        return {
          ...existingParticipant,
          reconnected: true,
          previousVote: previousVote ? previousVote.optionIndex : null,
        };
      }

      // New participant
      const participant = await this.participantRepo.addParticipant({
        pollId: poll.id,
        nickname,
        socketId,
      });

      logger.info({ participantId: participant.id, nickname, roomCode }, 'New participant added');

      return {
        ...participant,
        reconnected: false,
      };
    } catch (error) {
      logger.error({ error: error.message, roomCode, nickname }, 'Failed to add participant');
      throw error;
    }
  }

  /**
   * Submit or update a vote
   * @param {string} roomCode - Room code
   * @param {number} participantId - Participant ID
   * @param {number} optionIndex - Option index (0-based)
   * @returns {Promise<Object>} Vote statistics after submission
   */
  async submitVote(roomCode, participantId, optionIndex) {
    try {
      // Verify poll exists and is open
      const poll = await this.pollRepo.getPollByRoomCode(roomCode);
      if (!poll) {
        const error = new Error('Poll not found');
        error.code = 'POLL_NOT_FOUND';
        throw error;
      }

      if (poll.state !== 'open') {
        const error = new Error(`Voting is not allowed. Poll is ${poll.state}.`);
        error.code = 'POLL_NOT_OPEN';
        throw error;
      }

      // Validate option index
      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        const error = new Error(
          `Invalid option index: ${optionIndex}. Poll has ${poll.options.length} options.`
        );
        error.code = 'INVALID_OPTION';
        throw error;
      }

      // Submit vote
      await this.voteRepo.submitVote({ participantId, optionIndex });

      // Get updated vote statistics
      const voteStatistics = await this.voteRepo.getVoteStatistics(poll.id);

      logger.info({ participantId, optionIndex, roomCode }, 'Vote submitted via service');

      return {
        voteCounts: voteStatistics.voteCounts,
        percentages: voteStatistics.percentages,
        totalVotes: voteStatistics.totalVotes,
      };
    } catch (error) {
      logger.error(
        { error: error.message, roomCode, participantId, optionIndex },
        'Failed to submit vote'
      );
      throw error;
    }
  }

  /**
   * Handle participant disconnection
   * @param {string} socketId - Socket.io connection ID
   * @returns {Promise<Object|null>} Disconnected participant info
   */
  async handleDisconnect(socketId) {
    try {
      const participant = await this.participantRepo.markDisconnected(socketId);

      if (participant) {
        logger.info(
          { participantId: participant.id, nickname: participant.nickname, socketId },
          'Participant disconnected via service'
        );
      }

      return participant;
    } catch (error) {
      logger.error({ error: error.message, socketId }, 'Failed to handle disconnect');
      throw error;
    }
  }

  /**
   * Get all participants for a poll
   * @param {string} roomCode - Room code
   * @param {boolean} connectedOnly - Only return connected participants
   * @returns {Promise<Array>} Array of participants
   */
  async getParticipants(roomCode, connectedOnly = false) {
    try {
      const poll = await this.pollRepo.getPollByRoomCode(roomCode);
      if (!poll) {
        return [];
      }

      return this.participantRepo.getParticipantsByPoll(poll.id, connectedOnly);
    } catch (error) {
      logger.error({ error: error.message, roomCode }, 'Failed to get participants');
      throw error;
    }
  }

  /**
   * Restore active polls on server startup
   * Loads all active polls from database into memory (if needed)
   * @returns {Promise<Array>} Array of active polls
   */
  async restoreActivePolls() {
    try {
      const polls = await this.pollRepo.getAllActivePolls();
      logger.info({ count: polls.length }, 'Active polls restored from database');
      return polls;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to restore active polls');
      throw error;
    }
  }

  /**
   * Cleanup expired polls (for scheduled job)
   * @returns {Promise<number>} Number of polls expired
   */
  async expireOldPolls() {
    try {
      const expired = await this.pollRepo.expireOldPolls();
      logger.info({ count: expired.length }, 'Old polls expired via service');
      return expired.length;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to expire old polls');
      throw error;
    }
  }
}

module.exports = PollService;
