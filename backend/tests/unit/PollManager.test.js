const PollManager = require('../../src/models/PollManager.js');

describe('PollManager', () => {
  let pollManager;

  beforeEach(() => {
    pollManager = new PollManager();
  });

  describe('createPoll()', () => {
    it('should create a poll with valid inputs', () => {
      const question = 'What is your favorite color?';
      const options = ['Red', 'Blue', 'Green'];
      const hostSocketId = 'socket-123';

      const poll = pollManager.createPoll(question, options, hostSocketId);

      expect(poll).toBeDefined();
      expect(poll.roomCode).toBeDefined();
      expect(poll.roomCode).toHaveLength(6);
      expect(poll.question).toBe(question);
      expect(poll.options).toEqual(options);
      expect(poll.state).toBe('waiting');
      expect(poll.hostSocketId).toBe(hostSocketId);
      expect(poll.votes).toBeInstanceOf(Map);
      expect(poll.participants).toBeInstanceOf(Set);
      expect(poll.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique room codes for multiple polls', () => {
      const roomCodes = new Set();
      const numPolls = 100;

      for (let i = 0; i < numPolls; i += 1) {
        const poll = pollManager.createPoll(
          `Question ${i}`,
          ['Option A', 'Option B'],
          `socket-${i}`
        );
        roomCodes.add(poll.roomCode);
      }

      expect(roomCodes.size).toBe(numPolls);
    });

    it('should use only uppercase letters and digits 2-9 in room code', () => {
      const poll = pollManager.createPoll('Test?', ['A', 'B'], 'socket-1');
      const roomCode = poll.roomCode;

      // Custom alphabet: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (excludes 0, O, I, 1)
      const validChars = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
      expect(roomCode).toMatch(validChars);
    });

    it('should store poll in internal map accessible by room code', () => {
      const poll = pollManager.createPoll('Test?', ['A', 'B'], 'socket-1');
      const retrieved = pollManager.getPoll(poll.roomCode);

      expect(retrieved).toBe(poll);
    });

    it('should track host socket ID to room code mapping', () => {
      const hostSocketId = 'host-socket-456';
      const poll = pollManager.createPoll('Test?', ['A', 'B'], hostSocketId);

      expect(pollManager.socketRoomMap.get(hostSocketId)).toBe(poll.roomCode);
    });
  });

  describe('changePollState()', () => {
    let poll;
    let hostSocketId;

    beforeEach(() => {
      hostSocketId = 'host-123';
      poll = pollManager.createPoll('Test question?', ['A', 'B'], hostSocketId);
    });

    it('should change state from waiting to open when called by host', () => {
      const result = pollManager.changePollState(poll.roomCode, 'open', hostSocketId);

      expect(result.success).toBe(true);
      expect(result.poll.state).toBe('open');
      expect(result.previousState).toBe('waiting');
    });

    it('should change state from open to closed when called by host', () => {
      pollManager.changePollState(poll.roomCode, 'open', hostSocketId);
      const result = pollManager.changePollState(poll.roomCode, 'closed', hostSocketId);

      expect(result.success).toBe(true);
      expect(result.poll.state).toBe('closed');
      expect(result.previousState).toBe('open');
    });

    it('should reject state change from non-host socket ID', () => {
      const nonHostSocketId = 'hacker-999';
      const result = pollManager.changePollState(poll.roomCode, 'open', nonHostSocketId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the host can change poll state');
      expect(poll.state).toBe('waiting');
    });

    it('should reject state change for non-existent room code', () => {
      const result = pollManager.changePollState('FAKE99', 'open', hostSocketId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Poll not found');
    });

    it('should reject invalid state transitions', () => {
      const result = pollManager.changePollState(poll.roomCode, 'invalid-state', hostSocketId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid state');
    });

    it('should prevent reopening a closed poll', () => {
      pollManager.changePollState(poll.roomCode, 'open', hostSocketId);
      pollManager.changePollState(poll.roomCode, 'closed', hostSocketId);
      const result = pollManager.changePollState(poll.roomCode, 'open', hostSocketId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reopen');
    });

    it('should return the poll object and previous state on success', () => {
      const result = pollManager.changePollState(poll.roomCode, 'open', hostSocketId);

      expect(result.success).toBe(true);
      expect(result.poll).toBeDefined();
      expect(result.poll.roomCode).toBe(poll.roomCode);
      expect(result.previousState).toBe('waiting');
    });
  });
});
