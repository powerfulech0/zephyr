const {
  createPollSchema,
  roomCodeSchema,
  changePollStateSchema,
} = require('../../src/schemas/pollSchemas');

describe('Poll Validation Schemas', () => {
  describe('createPollSchema', () => {
    it('should validate valid poll creation request', () => {
      const validPoll = {
        question: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green'],
      };

      const { error } = createPollSchema.validate(validPoll);
      expect(error).toBeUndefined();
    });

    it('should reject empty question', () => {
      const invalidPoll = {
        question: '',
        options: ['A', 'B'],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
      expect(error.message).toContain('Question');
    });

    it('should reject question shorter than 5 characters', () => {
      const invalidPoll = {
        question: 'Why',
        options: ['A', 'B'],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
      expect(error.message).toContain('5 and 200');
    });

    it('should reject question exceeding 200 characters', () => {
      const invalidPoll = {
        question: 'a'.repeat(201),
        options: ['A', 'B'],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
      expect(error.message).toContain('5 and 200');
    });

    it('should reject less than 2 options', () => {
      const invalidPoll = {
        question: 'Valid question?',
        options: ['Only one'],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
      expect(error.message).toContain('2-5');
    });

    it('should reject more than 5 options', () => {
      const invalidPoll = {
        question: 'Valid question?',
        options: Array(6).fill('Option'),
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
      expect(error.message).toContain('2-5');
    });

    it('should accept exactly 5 options', () => {
      const validPoll = {
        question: 'Valid question?',
        options: ['A', 'B', 'C', 'D', 'E'],
      };

      const { error } = createPollSchema.validate(validPoll);
      expect(error).toBeUndefined();
    });

    it('should reject empty option text', () => {
      const invalidPoll = {
        question: 'Valid question?',
        options: ['Valid', ''],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
    });

    it('should reject option exceeding 100 characters', () => {
      const invalidPoll = {
        question: 'Valid question?',
        options: ['Valid', 'a'.repeat(101)],
      };

      const { error } = createPollSchema.validate(invalidPoll);
      expect(error).toBeDefined();
    });

    it('should trim whitespace from question and options', () => {
      const pollWithWhitespace = {
        question: '  What is this thing?  ',
        options: ['  Option A  ', '  Option B  '],
      };

      const { value, error } = createPollSchema.validate(pollWithWhitespace);
      expect(error).toBeUndefined();
      expect(value.question).toBe('What is this thing?');
      expect(value.options[0]).toBe('Option A');
      expect(value.options[1]).toBe('Option B');
    });
  });

  describe('roomCodeSchema', () => {
    it('should validate valid 6-character room code', () => {
      const validCode = '3B7KWX';
      const { error } = roomCodeSchema.validate(validCode);
      expect(error).toBeUndefined();
    });

    it('should reject room code shorter than 6 characters', () => {
      const invalidCode = 'ABC12';
      const { error } = roomCodeSchema.validate(invalidCode);
      expect(error).toBeDefined();
    });

    it('should reject room code longer than 6 characters', () => {
      const invalidCode = 'ABC1234';
      const { error } = roomCodeSchema.validate(invalidCode);
      expect(error).toBeDefined();
    });

    it('should reject room code with invalid characters (0, 1, O, I)', () => {
      const invalidCode = 'ABC01O';
      const { error } = roomCodeSchema.validate(invalidCode);
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid room code format');
    });

    it('should accept room code with valid alphabet only', () => {
      const validCode = '23456A';
      const { error } = roomCodeSchema.validate(validCode);
      expect(error).toBeUndefined();
    });

    it('should reject lowercase letters', () => {
      const invalidCode = 'abc123';
      const { error } = roomCodeSchema.validate(invalidCode);
      expect(error).toBeDefined();
    });
  });

  describe('changePollStateSchema', () => {
    it('should validate valid state change', () => {
      const validChange = {
        roomCode: '3B7KWX',
        newState: 'open',
      };

      const { error } = changePollStateSchema.validate(validChange);
      expect(error).toBeUndefined();
    });

    it('should accept all valid states', () => {
      const states = ['waiting', 'open', 'closed'];

      states.forEach(state => {
        const { error } = changePollStateSchema.validate({
          roomCode: '3B7KWX',
          newState: state,
        });
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid state', () => {
      const invalidChange = {
        roomCode: '3B7KWX',
        newState: 'invalid',
      };

      const { error } = changePollStateSchema.validate(invalidChange);
      expect(error).toBeDefined();
      expect(error.message).toContain('waiting, open, closed');
    });

    it('should reject missing roomCode', () => {
      const invalidChange = {
        newState: 'open',
      };

      const { error } = changePollStateSchema.validate(invalidChange);
      expect(error).toBeDefined();
    });

    it('should reject missing newState', () => {
      const invalidChange = {
        roomCode: '3B7KWX',
      };

      const { error } = changePollStateSchema.validate(invalidChange);
      expect(error).toBeDefined();
    });
  });
});
