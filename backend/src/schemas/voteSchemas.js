const Joi = require('joi');
const { roomCodeSchema } = require('./pollSchemas');

/**
 * Validation schemas for vote-related operations
 * Based on database constraints and security requirements
 */

// Vote submission schema
const submitVoteSchema = Joi.object({
  roomCode: roomCodeSchema,
  participantId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Participant ID must be a number',
      'number.integer': 'Participant ID must be an integer',
      'number.positive': 'Participant ID must be positive',
      'any.required': 'Participant ID is required',
    }),
  optionIndex: Joi.number()
    .integer()
    .min(0)
    .max(4)
    .required()
    .messages({
      'number.base': 'Option index must be a number',
      'number.integer': 'Option index must be an integer',
      'number.min': 'Option index must be between 0 and 4',
      'number.max': 'Option index must be between 0 and 4',
      'any.required': 'Option index is required',
    }),
}).messages({
  'object.unknown': 'Unknown field provided',
});

module.exports = {
  submitVoteSchema,
};
