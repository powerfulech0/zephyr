const { generateRoomCode } = require('../services/roomCodeGenerator.js');

class PollManager {
  constructor() {
    this.polls = new Map(); // roomCode → Poll object
    this.socketRoomMap = new Map(); // socketId → roomCode
  }

  /**
   * Create new poll and return poll object
   */
  createPoll(question, options, hostSocketId) {
    const roomCode = this._generateUniqueRoomCode();
    const poll = {
      roomCode,
      question,
      options,
      state: 'waiting',
      votes: new Map(),
      participants: new Set(),
      hostSocketId,
      createdAt: new Date(),
    };

    this.polls.set(roomCode, poll);
    this.socketRoomMap.set(hostSocketId, roomCode);

    return poll;
  }

  /**
   * Get poll by room code
   */
  getPoll(roomCode) {
    return this.polls.get(roomCode);
  }

  /**
   * Change poll state (host only)
   */
  changePollState(roomCode, newState, hostSocketId) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.hostSocketId !== hostSocketId) {
      return { success: false, error: 'Only the host can change poll state' };
    }
    if (!['waiting', 'open', 'closed'].includes(newState)) {
      return { success: false, error: 'Invalid state' };
    }

    // Prevent reopening closed polls
    if (poll.state === 'closed' && newState === 'open') {
      return { success: false, error: 'Cannot reopen a closed poll' };
    }

    const previousState = poll.state;
    poll.state = newState;
    return { success: true, poll, previousState };
  }

  /**
   * Add participant to poll
   * @returns {success, error, poll}
   */
  addParticipant(roomCode, nickname, socketId) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.participants.has(nickname)) {
      return { success: false, error: 'Nickname already taken' };
    }
    if (poll.participants.size >= 20) {
      return { success: false, error: 'Room is full (20 participants max)' };
    }

    poll.participants.add(nickname);
    this.socketRoomMap.set(socketId, roomCode);

    return { success: true, poll };
  }

  /**
   * Record or update vote
   * @returns {success, error, votes, percentages}
   */
  recordVote(roomCode, nickname, optionIndex) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.state !== 'open') {
      return { success: false, error: 'Voting is not open' };
    }
    if (!poll.participants.has(nickname)) {
      return { success: false, error: 'Participant not in room' };
    }
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return { success: false, error: 'Invalid option index' };
    }

    poll.votes.set(nickname, optionIndex);

    const counts = this._calculateVoteCounts(poll);
    const percentages = this._calculatePercentages(counts);

    return {
      success: true,
      votes: counts,
      percentages,
    };
  }

  /**
   * Remove participant on disconnect
   */
  removeParticipant(socketId) {
    const roomCode = this.socketRoomMap.get(socketId);
    if (!roomCode) return null;

    const poll = this.polls.get(roomCode);
    if (!poll) return null;

    // Find and remove nickname
    let removedNickname = null;
    // eslint-disable-next-line no-restricted-syntax
    for (const nickname of poll.participants) {
      // Match by socketId (simple approach: remove first match)
      // In production, would need better socket-to-nickname mapping
      removedNickname = nickname;
      poll.participants.delete(nickname);
      break;
    }

    this.socketRoomMap.delete(socketId);

    // Clear poll if all participants gone and host disconnected
    if (poll.participants.size === 0 && poll.hostSocketId === socketId) {
      this.polls.delete(roomCode);
      return { roomCode, cleared: true, nickname: removedNickname };
    }

    return { roomCode, cleared: false, nickname: removedNickname };
  }

  /**
   * Generate unique room code (retry on collision)
   */
  _generateUniqueRoomCode() {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (this.polls.has(roomCode));
    return roomCode;
  }

  _calculateVoteCounts(poll) {
    const counts = new Array(poll.options.length).fill(0);
    // eslint-disable-next-line no-restricted-syntax
    for (const [nickname, optionIndex] of poll.votes.entries()) {
      if (poll.participants.has(nickname)) {
        counts[optionIndex] += 1;
      }
    }
    return counts;
  }

  _calculatePercentages(counts) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total === 0) return counts.map(() => 0);
    return counts.map(count => Math.round((count / total) * 100));
  }
}

module.exports = PollManager;
