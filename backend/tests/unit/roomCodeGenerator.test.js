const { generateRoomCode } = require('../../src/services/roomCodeGenerator.js');

describe('roomCodeGenerator', () => {
  describe('generateRoomCode()', () => {
    it('should generate a 6-character room code', () => {
      const roomCode = generateRoomCode();

      expect(roomCode).toBeDefined();
      expect(typeof roomCode).toBe('string');
      expect(roomCode).toHaveLength(6);
    });

    it('should only use characters from custom alphabet (no 0, O, I, 1)', () => {
      const roomCode = generateRoomCode();

      // Custom alphabet: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
      const validChars = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
      expect(roomCode).toMatch(validChars);

      // Explicitly check no ambiguous characters
      expect(roomCode).not.toContain('0');
      expect(roomCode).not.toContain('O');
      expect(roomCode).not.toContain('I');
      expect(roomCode).not.toContain('1');
    });

    it('should generate unique codes for multiple invocations', () => {
      const codes = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i += 1) {
        codes.add(generateRoomCode());
      }

      // With 32 characters and length 6, collision probability is extremely low
      // For 1000 samples: ~99.9999% should be unique
      expect(codes.size).toBeGreaterThan(iterations * 0.99);
    });

    it('should generate codes with high entropy', () => {
      const codes = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i += 1) {
        codes.push(generateRoomCode());
      }

      // Check character distribution is reasonable (no code should be all same char)
      codes.forEach(code => {
        const uniqueChars = new Set(code.split(''));
        expect(uniqueChars.size).toBeGreaterThan(1);
      });
    });

    it('should always return uppercase letters and digits only', () => {
      const iterations = 50;

      for (let i = 0; i < iterations; i += 1) {
        const code = generateRoomCode();
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(code).toBe(code.toUpperCase());
      }
    });
  });
});
