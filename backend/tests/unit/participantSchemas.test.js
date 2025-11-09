const {
  joinRoomSchema,
  nicknameSchema,
} = require('../../src/schemas/participantSchemas');

describe('Participant Validation Schemas', () => {
  describe('joinRoomSchema', () => {
    it('should validate valid join room request', () => {
      const validRequest = {
        roomCode: '3B7KWX',
        nickname: 'Alice',
      };

      const { error } = joinRoomSchema.validate(validRequest);
      expect(error).toBeUndefined();
    });

    it('should reject missing roomCode', () => {
      const invalidRequest = {
        nickname: 'Alice',
      };

      const { error } = joinRoomSchema.validate(invalidRequest);
      expect(error).toBeDefined();
      expect(error.message).toContain('Room code');
    });

    it('should reject missing nickname', () => {
      const invalidRequest = {
        roomCode: '3B7KWX',
      };

      const { error } = joinRoomSchema.validate(invalidRequest);
      expect(error).toBeDefined();
      expect(error.message).toContain('Nickname');
    });

    it('should trim whitespace from nickname', () => {
      const request = {
        roomCode: '3B7KWX',
        nickname: '  Alice  ',
      };

      const { value, error } = joinRoomSchema.validate(request);
      expect(error).toBeUndefined();
      expect(value.nickname).toBe('Alice');
    });

    it('should reject invalid roomCode format', () => {
      const request = {
        roomCode: 'INVALID',
        nickname: 'Alice',
      };

      const { error } = joinRoomSchema.validate(request);
      expect(error).toBeDefined();
    });
  });

  describe('nicknameSchema', () => {
    it('should validate valid nickname', () => {
      const { error } = nicknameSchema.validate('Alice');
      expect(error).toBeUndefined();
    });

    it('should validate nickname with numbers', () => {
      const { error } = nicknameSchema.validate('User123');
      expect(error).toBeUndefined();
    });

    it('should validate nickname with spaces', () => {
      const { error } = nicknameSchema.validate('Alice Smith');
      expect(error).toBeUndefined();
    });

    it('should validate nickname with hyphens', () => {
      const { error } = nicknameSchema.validate('Alice-Bob');
      expect(error).toBeUndefined();
    });

    it('should validate nickname with underscores', () => {
      const { error } = nicknameSchema.validate('Alice_Bob');
      expect(error).toBeUndefined();
    });

    it('should reject empty nickname', () => {
      const { error } = nicknameSchema.validate('');
      expect(error).toBeDefined();
    });

    it('should reject nickname shorter than 2 characters', () => {
      const { error } = nicknameSchema.validate('A');
      expect(error).toBeDefined();
      expect(error.message).toContain('at least 2');
    });

    it('should reject nickname longer than 50 characters', () => {
      const longNickname = 'a'.repeat(51);
      const { error} = nicknameSchema.validate(longNickname);
      expect(error).toBeDefined();
      expect(error.message).toContain('not exceed 50');
    });

    it('should reject nickname with special characters', () => {
      const { error } = nicknameSchema.validate('Alice@#$');
      expect(error).toBeDefined();
      expect(error.message).toContain('letters, numbers, spaces');
    });

    it('should trim whitespace', () => {
      const { value, error } = nicknameSchema.validate('  Alice  ');
      expect(error).toBeUndefined();
      expect(value).toBe('Alice');
    });
  });
});
