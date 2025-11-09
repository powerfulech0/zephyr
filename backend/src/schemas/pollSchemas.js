const Joi = require('joi');

/**
 * Validation schemas for poll-related operations
 * Based on database constraints and security requirements
 */

// Poll creation schema
const createPollSchema = Joi.object({
  question: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Question must be between 5 and 200 characters',
      'string.base': 'Question is required and must be a string',
      'string.min': 'Question must be between 5 and 200 characters',
      'string.max': 'Question must be between 5 and 200 characters',
      'any.required': 'Question is required',
    }),

  options: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
          'string.empty': 'Option must be between 1 and 100 characters',
          'string.min': 'Option must be between 1 and 100 characters',
          'string.max': 'Option must be between 1 and 100 characters',
        })
    )
    .min(2)
    .max(5)
    .required()
    .messages({
      'array.base': 'Options must be an array',
      'array.min': 'Options array must contain 2-5 elements',
      'array.max': 'Options array must contain 2-5 elements',
      'any.required': 'Options are required',
    }),
});

// Room code validation schema
const roomCodeSchema = Joi.string()
  .length(6)
  .pattern(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  .required()
  .messages({
    'string.length': 'Room code must be exactly 6 characters',
    'string.pattern.base': 'Invalid room code format',
    'any.required': 'Room code is required',
  });

// Poll state change schema
const changePollStateSchema = Joi.object({
  roomCode: roomCodeSchema,
  newState: Joi.string()
    .valid('waiting', 'open', 'closed')
    .required()
    .messages({
      'any.only': 'State must be one of: waiting, open, closed',
      'any.required': 'New state is required',
    }),
});

module.exports = {
  createPollSchema,
  roomCodeSchema,
  changePollStateSchema,
};
