const Joi = require('joi');

/**
 * Host Authentication Schemas
 *
 * Validation schemas for optional host authentication credentials.
 * Used when HOST_AUTH_ENABLED=true to restrict poll control actions.
 */

/**
 * Schema for host login credentials
 */
const hostLoginSchema = Joi.object({
  roomCode: Joi.string()
    .length(6)
    .pattern(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
    .required()
    .messages({
      'string.length': 'Room code must be exactly 6 characters',
      'string.pattern.base': 'Room code contains invalid characters',
      'any.required': 'Room code is required',
    }),

  hostSecret: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Host secret must be at least 8 characters',
      'string.max': 'Host secret must not exceed 128 characters',
      'any.required': 'Host secret is required',
    }),
});

/**
 * Schema for host token verification
 */
const hostTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Authentication token is required',
    }),
});

module.exports = {
  hostLoginSchema,
  hostTokenSchema,
};
