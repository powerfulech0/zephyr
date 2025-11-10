/**
 * Room Code Formatter Utility (T094)
 *
 * Provides utilities for formatting and displaying room codes
 * consistently across the application
 */

/**
 * Formats a room code for display by adding separators
 * Example: "AB3K9T" -> "AB3-K9T" or "AB3 K9T"
 *
 * @param {string} roomCode - The room code to format (6 characters)
 * @param {string} separator - The separator to use (default: '-')
 * @returns {string} Formatted room code
 */
export const formatRoomCode = (roomCode, separator = '-') => {
  if (!roomCode || typeof roomCode !== 'string') {
    return '';
  }

  // Room codes are 6 characters, split in middle (AB3-K9T)
  const cleaned = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length !== 6) {
    return cleaned; // Return as-is if not standard 6-char format
  }

  return `${cleaned.substring(0, 3)}${separator}${cleaned.substring(3)}`;
};

/**
 * Formats a room code with spacing for better readability
 * Example: "AB3K9T" -> "AB3 K9T"
 *
 * @param {string} roomCode - The room code to format
 * @returns {string} Formatted room code with spaces
 */
export const formatRoomCodeWithSpaces = roomCode => formatRoomCode(roomCode, ' ');

/**
 * Validates a room code format
 * @param {string} roomCode - The room code to validate
 * @returns {boolean} True if valid format (6 alphanumeric characters)
 */
export const isValidRoomCodeFormat = roomCode => {
  if (!roomCode || typeof roomCode !== 'string') {
    return false;
  }

  const cleaned = roomCode.replace(/[^A-Z0-9]/gi, '');
  return cleaned.length === 6 && /^[A-Z0-9]{6}$/i.test(cleaned);
};

/**
 * Cleans a room code by removing separators and converting to uppercase
 * Example: "ab3-k9t" -> "AB3K9T"
 *
 * @param {string} roomCode - The room code to clean
 * @returns {string} Cleaned room code
 */
export const cleanRoomCode = roomCode => {
  if (!roomCode || typeof roomCode !== 'string') {
    return '';
  }

  return roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

/**
 * Formats a room code for copy-to-clipboard (no separators)
 * @param {string} roomCode - The room code
 * @returns {string} Clean room code suitable for clipboard
 */
export const formatForClipboard = roomCode => cleanRoomCode(roomCode);

/**
 * Creates a shareable URL with the room code
 * @param {string} roomCode - The room code
 * @param {string} baseUrl - The base URL (default: current origin)
 * @returns {string} Shareable URL
 */
export const createShareableUrl = (roomCode, baseUrl = window.location.origin) => {
  const cleaned = cleanRoomCode(roomCode);
  return `${baseUrl}/join/${cleaned}`;
};

export default {
  formatRoomCode,
  formatRoomCodeWithSpaces,
  isValidRoomCodeFormat,
  cleanRoomCode,
  formatForClipboard,
  createShareableUrl,
};
