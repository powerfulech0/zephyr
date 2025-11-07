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

  describe('addParticipant()', () => {
    let poll;
    let hostSocketId;

    beforeEach(() => {
      hostSocketId = 'host-123';
      poll = pollManager.createPoll('Test question?', ['A', 'B', 'C'], hostSocketId);
    });

    it('should add participant with valid nickname and socket ID', () => {
      const result = pollManager.addParticipant(poll.roomCode, 'Alice', 'socket-alice');

      expect(result.success).toBe(true);
      expect(result.poll).toBeDefined();
      expect(poll.participants.has('Alice')).toBe(true);
      expect(pollManager.socketRoomMap.get('socket-alice')).toBe(poll.roomCode);
    });

    it('should reject duplicate nickname in same room', () => {
      pollManager.addParticipant(poll.roomCode, 'Alice', 'socket-alice-1');
      const result = pollManager.addParticipant(poll.roomCode, 'Alice', 'socket-alice-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });

    it('should reject when poll not found', () => {
      const result = pollManager.addParticipant('FAKE99', 'Alice', 'socket-alice');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Poll not found');
    });

    it('should reject when room is full (20 participants max)', () => {
      // Add 20 participants
      for (let i = 0; i < 20; i += 1) {
        pollManager.addParticipant(poll.roomCode, `User${i}`, `socket-${i}`);
      }

      const result = pollManager.addParticipant(poll.roomCode, 'User21', 'socket-21');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full (20 participants max)');
      expect(poll.participants.size).toBe(20);
    });

    it('should allow same nickname in different rooms', () => {
      const poll2 = pollManager.createPoll('Another poll?', ['X', 'Y'], 'host-456');

      const result1 = pollManager.addParticipant(poll.roomCode, 'Alice', 'socket-alice-1');
      const result2 = pollManager.addParticipant(poll2.roomCode, 'Alice', 'socket-alice-2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('recordVote()', () => {
    let poll;
    let hostSocketId;

    beforeEach(() => {
      hostSocketId = 'host-123';
      poll = pollManager.createPoll('What is your favorite?', ['A', 'B', 'C'], hostSocketId);
      pollManager.addParticipant(poll.roomCode, 'Alice', 'socket-alice');
      pollManager.addParticipant(poll.roomCode, 'Bob', 'socket-bob');
      pollManager.changePollState(poll.roomCode, 'open', hostSocketId);
    });

    it('should record vote when poll is open', () => {
      const result = pollManager.recordVote(poll.roomCode, 'Alice', 0);

      expect(result.success).toBe(true);
      expect(result.votes).toBeDefined();
      expect(result.percentages).toBeDefined();
      expect(poll.votes.get('Alice')).toBe(0);
    });

    it('should return updated vote counts after recording', () => {
      pollManager.recordVote(poll.roomCode, 'Alice', 0);
      const result = pollManager.recordVote(poll.roomCode, 'Bob', 0);

      expect(result.success).toBe(true);
      expect(result.votes).toEqual([2, 0, 0]); // 2 votes for option A
      expect(result.percentages).toEqual([100, 0, 0]); // 100% for option A
    });

    it('should allow participant to change their vote', () => {
      pollManager.recordVote(poll.roomCode, 'Alice', 0);
      const result = pollManager.recordVote(poll.roomCode, 'Alice', 1);

      expect(result.success).toBe(true);
      expect(poll.votes.get('Alice')).toBe(1);
      expect(result.votes).toEqual([0, 1, 0]); // Vote changed to option B
    });

    it('should reject vote when poll state is waiting', () => {
      const poll2 = pollManager.createPoll('New poll?', ['X', 'Y'], 'host-456');
      pollManager.addParticipant(poll2.roomCode, 'Charlie', 'socket-charlie');

      const result = pollManager.recordVote(poll2.roomCode, 'Charlie', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Voting is not open');
    });

    it('should reject vote when poll state is closed', () => {
      pollManager.changePollState(poll.roomCode, 'closed', hostSocketId);
      const result = pollManager.recordVote(poll.roomCode, 'Alice', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Voting is not open');
    });

    it('should reject vote for invalid option index', () => {
      const result = pollManager.recordVote(poll.roomCode, 'Alice', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid option index');
    });

    it('should reject vote for negative option index', () => {
      const result = pollManager.recordVote(poll.roomCode, 'Alice', -1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid option index');
    });

    it('should reject vote from participant not in room', () => {
      const result = pollManager.recordVote(poll.roomCode, 'Unknown', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Participant not in room');
    });

    it('should reject vote when poll not found', () => {
      const result = pollManager.recordVote('FAKE99', 'Alice', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Poll not found');
    });

    it('should calculate percentages correctly with multiple votes', () => {
      pollManager.recordVote(poll.roomCode, 'Alice', 0);
      pollManager.recordVote(poll.roomCode, 'Bob', 1);

      const poll2 = pollManager.getPoll(poll.roomCode);
      // Add more participants for better percentage test
      pollManager.addParticipant(poll.roomCode, 'Charlie', 'socket-charlie');
      pollManager.addParticipant(poll.roomCode, 'Diana', 'socket-diana');
      pollManager.recordVote(poll.roomCode, 'Charlie', 0);
      const result = pollManager.recordVote(poll.roomCode, 'Diana', 2);

      expect(result.success).toBe(true);
      expect(result.votes).toEqual([2, 1, 1]); // 2 for A, 1 for B, 1 for C
      expect(result.percentages).toEqual([50, 25, 25]); // 50%, 25%, 25%
    });
  });
});
