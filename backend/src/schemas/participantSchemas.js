const Joi = require('joi');
const { roomCodeSchema } = require('./pollSchemas');

/**
 * Validation schemas for participant-related operations
 * Based on database constraints and security requirements
 */

// Nickname validation schema
const nicknameSchema = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-Z0-9\s_-]+$/)
  .required()
  .messages({
    'string.empty': 'Nickname is required',
    'string.min': 'Nickname must be at least 2 characters',
    'string.max': 'Nickname must not exceed 50 characters',
    'string.pattern.base': 'Nickname can only contain letters, numbers, spaces, underscores, and hyphens',
    'any.required': 'Nickname is required',
  });

// Join room schema
const joinRoomSchema = Joi.object({
  roomCode: roomCodeSchema,
  nickname: nicknameSchema,
}).messages({
  'object.unknown': 'Unknown field provided',
});

module.exports = {
  nicknameSchema,
  joinRoomSchema,
};
