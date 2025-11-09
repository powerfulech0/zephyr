const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

/**
 * Host Authentication Middleware
 *
 * Optional middleware for authenticating poll control actions using JWT tokens.
 * Enabled when HOST_AUTH_ENABLED=true environment variable is set.
 *
 * Token payload contains:
 * - roomCode: The poll room code this token is valid for
 * - role: 'host'
 * - exp: Token expiration timestamp
 */

/**
 * Verify JWT token and extract host credentials
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const hostAuth = (req, res, next) => {
  // Skip authentication if HOST_AUTH_ENABLED is not true
  if (process.env.HOST_AUTH_ENABLED !== 'true') {
    logger.debug({ feature: 'hostAuth' }, 'Host authentication disabled, skipping');
    return next();
  }

  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(
        {
          ip: req.ip,
          path: req.path,
          roomCode: req.params.roomCode || req.body.roomCode,
        },
        'Missing or invalid Authorization header'
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authentication token',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
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

    // Validate role
    if (decoded.role !== 'host') {
      logger.warn(
        {
          ip: req.ip,
          role: decoded.role,
          roomCode: req.params.roomCode || req.body.roomCode,
        },
        'Invalid role in token'
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    // Validate room code matches (if applicable)
    const requestedRoomCode = req.params.roomCode || req.body.roomCode;
    if (requestedRoomCode && decoded.roomCode !== requestedRoomCode) {
      logger.warn(
        {
          ip: req.ip,
          tokenRoomCode: decoded.roomCode,
          requestedRoomCode,
        },
        'Room code mismatch in token'
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Token not valid for this poll',
      });
    }

    // Attach decoded token to request for downstream use
    req.hostAuth = {
      roomCode: decoded.roomCode,
      role: decoded.role,
    };

    logger.debug(
      {
        roomCode: decoded.roomCode,
        ip: req.ip,
      },
      'Host authentication successful'
    );

    return next();
  } catch (error) {
    // Handle JWT verification errors
    if (error.name === 'TokenExpiredError') {
      logger.warn(
        {
          ip: req.ip,
          expiredAt: error.expiredAt,
          roomCode: req.params.roomCode || req.body.roomCode,
        },
        'Expired authentication token'
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn(
        {
          ip: req.ip,
          error: error.message,
          roomCode: req.params.roomCode || req.body.roomCode,
        },
        'Invalid authentication token'
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
    }

    // Unexpected error
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
      },
      'Host authentication error'
    );
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication verification failed',
    });
  }
};

module.exports = hostAuth;
