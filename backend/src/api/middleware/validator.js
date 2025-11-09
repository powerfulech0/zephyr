const xss = require('xss');
const logger = require('../../config/logger');
const AuditLogRepository = require('../../models/repositories/AuditLogRepository');
const { createPollSchema, roomCodeSchema } = require('../../schemas/pollSchemas');
const { joinRoomSchema } = require('../../schemas/participantSchemas');
const { submitVoteSchema } = require('../../schemas/voteSchemas');

/**
 * Enhanced validation middleware using Joi schemas and XSS sanitization
 * Implements FR-007, FR-008: Input validation and sanitization
 */

/**
 * Sanitize string inputs to prevent XSS attacks
 * @param {*} value - Value to sanitize
 * @returns {*} Sanitized value
 */
function sanitizeInput(value) {
  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (value && typeof value === 'object') {
    const sanitized = {};
    Object.keys(value).forEach((key) => {
      sanitized[key] = sanitizeInput(value[key]);
    });
    return sanitized;
  }
  return value;
}

/**
 * Generic Joi validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - Request source ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
function validateWithSchema(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    // Sanitize input first
    const sanitized = sanitizeInput(data);

    // Validate with Joi
    const { error, value } = schema.validate(sanitized, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn(
        {
          source,
          errors,
          ip: req.ip,
          path: req.path,
        },
        'Validation failed'
      );

      // Log to audit_logs table (async, non-blocking)
      AuditLogRepository.logEvent({
        eventType: 'invalid_input',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: {
          source,
          errors,
          path: req.path,
          method: req.method,
          inputData: sanitized, // Log sanitized data (XSS-safe)
        },
      }).catch((logError) => {
        logger.error({ error: logError.message }, 'Failed to log invalid input to audit_logs');
      });

      return res.status(400).json({
        error: errors[0], // Return first error for backward compatibility
        errors, // All errors for detailed debugging
      });
    }

    // Replace request data with sanitized and validated data
    req[source] = value;
    next();
  };
}

/**
 * Poll creation validation middleware
 */
const validatePollCreation = validateWithSchema(createPollSchema, 'body');

/**
 * Room code validation middleware
 */
const validateRoomCode = (req, res, next) => {
  const { roomCode } = req.params;

  const { error } = roomCodeSchema.validate(roomCode);

  if (error) {
    logger.warn(
      {
        roomCode,
        error: error.message,
        ip: req.ip,
        path: req.path,
      },
      'Room code validation failed'
    );

    // Log to audit_logs table (async, non-blocking)
    AuditLogRepository.logEvent({
      eventType: 'invalid_input',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        validationType: 'room_code',
        roomCode,
        error: error.message,
        path: req.path,
      },
    }).catch((logError) => {
      logger.error({ error: logError.message }, 'Failed to log invalid room code to audit_logs');
    });

    return res.status(400).json({
      error: error.message,
    });
  }

  next();
};

/**
 * Join room validation middleware (for WebSocket events)
 */
const validateJoinRoom = validateWithSchema(joinRoomSchema, 'body');

/**
 * Vote submission validation middleware (for WebSocket events)
 */
const validateVoteSubmission = validateWithSchema(submitVoteSchema, 'body');

module.exports = {
  validatePollCreation,
  validateRoomCode,
  validateJoinRoom,
  validateVoteSubmission,
  sanitizeInput,
  validateWithSchema,
};
