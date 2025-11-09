const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');
const { validateWithSchema } = require('../middleware/validator');
const { hostLoginSchema, hostTokenSchema } = require('../../schemas/hostAuthSchemas');
const pollService = require('../../services/pollService');

const router = express.Router();

/**
 * POST /api/auth/host/login
 *
 * Authenticate as poll host and receive JWT token for poll control actions.
 * Requires HOST_AUTH_ENABLED=true in environment.
 *
 * Body: { roomCode, hostSecret }
 * Response: { token, expiresAt }
 */
router.post('/host/login', validateWithSchema(hostLoginSchema), async (req, res) => {
  try {
    // Check if host authentication is enabled
    if (process.env.HOST_AUTH_ENABLED !== 'true') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Host authentication is not enabled',
      });
    }

    const { roomCode, hostSecret } = req.body;

    // Verify poll exists
    const poll = await pollService.getPollByRoomCode(roomCode);

    if (!poll) {
      logger.warn(
        {
          correlationId: req.correlationId,
          ip: req.ip,
          roomCode,
        },
        'Host login attempt for non-existent poll'
      );
      return res.status(404).json({
        error: 'Not Found',
        message: 'Poll not found',
      });
    }

    // Verify host secret matches (poll.hostSecret stored during creation)
    // For MVP: Simple string comparison
    // For production: Use bcrypt.compare for hashed secrets
    if (!poll.hostSecret || poll.hostSecret !== hostSecret) {
      logger.warn(
        {
          correlationId: req.correlationId,
          ip: req.ip,
          roomCode,
        },
        'Host login attempt with invalid credentials'
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid host credentials',
      });
    }

    // Generate JWT token
    const secret = process.env.HOST_AUTH_SECRET;
    if (!secret) {
      logger.error('HOST_AUTH_SECRET not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication system misconfigured',
      });
    }

    const expiresIn = '24h'; // Token valid for 24 hours
    const token = jwt.sign(
      {
        roomCode,
        role: 'host',
      },
      secret,
      {
        expiresIn,
        algorithm: 'HS256',
      }
    );

    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    logger.info(
      {
        correlationId: req.correlationId,
        roomCode,
        ip: req.ip,
        expiresAt,
      },
      'Host login successful'
    );

    return res.json({
      token,
      expiresAt,
    });
  } catch (error) {
    logger.error(
      {
        correlationId: req.correlationId,
        error: error.message,
        stack: error.stack,
      },
      'Host login error'
    );
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate host',
    });
  }
});

/**
 * POST /api/auth/host/verify
 *
 * Verify JWT token validity.
 *
 * Body: { token }
 * Response: { valid: true, roomCode, expiresAt } or { valid: false, error }
 */
router.post('/host/verify', validateWithSchema(hostTokenSchema), (req, res) => {
  try {
    // Check if host authentication is enabled
    if (process.env.HOST_AUTH_ENABLED !== 'true') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Host authentication is not enabled',
      });
    }

    const { token } = req.body;
    const secret = process.env.HOST_AUTH_SECRET;

    if (!secret) {
      logger.error('HOST_AUTH_SECRET not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication system misconfigured',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    logger.debug(
      {
        correlationId: req.correlationId,
        roomCode: decoded.roomCode,
        ip: req.ip,
      },
      'Token verification successful'
    );

    res.json({
      valid: true,
      roomCode: decoded.roomCode,
      role: decoded.role,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    });
  } catch (error) {
    // Return valid: false for any verification failure
    logger.debug(
      {
        correlationId: req.correlationId,
        error: error.message,
        ip: req.ip,
      },
      'Token verification failed'
    );

    res.json({
      valid: false,
      error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }
});

module.exports = router;
