const {
  submitVoteSchema,
} = require('../../src/schemas/voteSchemas');

describe('Vote Validation Schemas', () => {
  describe('submitVoteSchema', () => {
    it('should validate valid vote submission', () => {
      const validVote = {
        roomCode: '3B7KWX',
        participantId: 1,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(validVote);
      expect(error).toBeUndefined();
    });

    it('should reject missing roomCode', () => {
      const invalidVote = {
        participantId: 1,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('Room code');
    });

    it('should reject missing participantId', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('Participant ID');
    });

    it('should reject missing optionIndex', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 1,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('Option index');
    });

    it('should reject negative optionIndex', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 1,
        optionIndex: -1,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('between 0 and 4');
    });

    it('should reject optionIndex greater than 4', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 1,
        optionIndex: 5,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('between 0 and 4');
    });

    it('should accept optionIndex 0', () => {
      const validVote = {
        roomCode: '3B7KWX',
        participantId: 1,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(validVote);
      expect(error).toBeUndefined();
    });

    it('should accept optionIndex 4 (max)', () => {
      const validVote = {
        roomCode: '3B7KWX',
        participantId: 1,
        optionIndex: 4,
      };

      const { error } = submitVoteSchema.validate(validVote);
      expect(error).toBeUndefined();
    });

    it('should reject invalid roomCode format', () => {
      const invalidVote = {
        roomCode: 'invalid',
        participantId: 1,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
    });

    it('should reject non-integer participantId', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 1.5,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('integer');
    });

    it('should reject negative participantId', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: -1,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('positive');
    });

    it('should reject zero participantId', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 0,
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('positive');
    });

    it('should reject string participantId', () => {
      const invalidVote = {
        roomCode: '3B7KWX',
        participantId: 'one',
        optionIndex: 0,
      };

      const { error } = submitVoteSchema.validate(invalidVote);
      expect(error).toBeDefined();
      expect(error.message).toContain('number');
    });

    it('should accept all valid option indices (0-4)', () => {
      for (let i = 0; i <= 4; i += 1) {
        const vote = {
          roomCode: '3B7KWX',
          participantId: 1,
          optionIndex: i,
        };

        const { error } = submitVoteSchema.validate(vote);
        expect(error).toBeUndefined();
      }
    });
  });
});
