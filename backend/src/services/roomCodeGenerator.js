const { customAlphabet } = require('nanoid');

// Custom alphabet excluding ambiguous characters: 0, O, I, 1
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(alphabet, 6);

module.exports = { generateRoomCode };
