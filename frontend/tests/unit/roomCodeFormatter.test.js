/**
 * Room Code Formatter Utility Tests (T095)
 *
 * Tests for room code formatting and validation
 */

import {
  formatRoomCode,
  formatRoomCodeWithSpaces,
  isValidRoomCodeFormat,
  cleanRoomCode,
  formatForClipboard,
  createShareableUrl,
} from '../../src/utils/roomCodeFormatter';

describe('formatRoomCode', () => {
  it('should format 6-character room code with dash separator', () => {
    expect(formatRoomCode('AB3K9T')).toBe('AB3-K9T');
  });

  it('should format lowercase room code and convert to uppercase', () => {
    expect(formatRoomCode('ab3k9t')).toBe('AB3-K9T');
  });

  it('should use custom separator', () => {
    expect(formatRoomCode('AB3K9T', ' ')).toBe('AB3 K9T');
    expect(formatRoomCode('AB3K9T', '_')).toBe('AB3_K9T');
  });

  it('should handle empty or invalid input', () => {
    expect(formatRoomCode('')).toBe('');
    expect(formatRoomCode(null)).toBe('');
    expect(formatRoomCode(undefined)).toBe('');
  });

  it('should handle non-standard length codes', () => {
    expect(formatRoomCode('ABC')).toBe('ABC');
    expect(formatRoomCode('ABCDEFGH')).toBe('ABCDEFGH');
  });
});

describe('formatRoomCodeWithSpaces', () => {
  it('should format with space separator', () => {
    expect(formatRoomCodeWithSpaces('AB3K9T')).toBe('AB3 K9T');
  });
});

describe('isValidRoomCodeFormat', () => {
  it('should validate correct 6-character alphanumeric codes', () => {
    expect(isValidRoomCodeFormat('AB3K9T')).toBe(true);
    expect(isValidRoomCodeFormat('ab3k9t')).toBe(true);
    expect(isValidRoomCodeFormat('123456')).toBe(true);
    expect(isValidRoomCodeFormat('ABCDEF')).toBe(true);
  });

  it('should accept codes with separators and validate cleaned version', () => {
    expect(isValidRoomCodeFormat('AB3-K9T')).toBe(true);
    expect(isValidRoomCodeFormat('AB3 K9T')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidRoomCodeFormat('ABC')).toBe(false); // Too short
    expect(isValidRoomCodeFormat('ABCDEFGH')).toBe(false); // Too long
    expect(isValidRoomCodeFormat('')).toBe(false); // Empty
    expect(isValidRoomCodeFormat(null)).toBe(false); // Null
    expect(isValidRoomCodeFormat(undefined)).toBe(false); // Undefined
  });

  it('should reject codes with special characters (after cleaning)', () => {
    expect(isValidRoomCodeFormat('AB3@K9')).toBe(false); // Special char
  });
});

describe('cleanRoomCode', () => {
  it('should remove separators and convert to uppercase', () => {
    expect(cleanRoomCode('ab3-k9t')).toBe('AB3K9T');
    expect(cleanRoomCode('AB3 K9T')).toBe('AB3K9T');
    expect(cleanRoomCode('ab3_k9_t')).toBe('AB3K9T');
  });

  it('should remove all non-alphanumeric characters', () => {
    expect(cleanRoomCode('AB3@K#9!T')).toBe('AB3K9T');
  });

  it('should handle empty or invalid input', () => {
    expect(cleanRoomCode('')).toBe('');
    expect(cleanRoomCode(null)).toBe('');
    expect(cleanRoomCode(undefined)).toBe('');
  });
});

describe('formatForClipboard', () => {
  it('should return clean uppercase code suitable for clipboard', () => {
    expect(formatForClipboard('AB3-K9T')).toBe('AB3K9T');
    expect(formatForClipboard('ab3 k9t')).toBe('AB3K9T');
  });
});

describe('createShareableUrl', () => {
  it('should create URL with cleaned room code', () => {
    const url = createShareableUrl('AB3K9T', 'http://localhost:3000');
    expect(url).toBe('http://localhost:3000/join/AB3K9T');
  });

  it('should clean room code with separators', () => {
    const url = createShareableUrl('AB3-K9T', 'http://localhost:3000');
    expect(url).toBe('http://localhost:3000/join/AB3K9T');
  });

  it('should convert to uppercase', () => {
    const url = createShareableUrl('ab3k9t', 'http://localhost:3000');
    expect(url).toBe('http://localhost:3000/join/AB3K9T');
  });
});
