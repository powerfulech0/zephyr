const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../../config/cache.js');
const logger = require('../../config/logger.js');
const AuditLogRepository = require('../../models/repositories/AuditLogRepository.js');
const { rateLimitExceeded } = require('../../services/metricsService.js');

/**
 * Rate limiting middleware using express-rate-limit with Redis store
 * Implements FR-009: Rate limiting to prevent abuse
 *
 * Rate limits:
 * - Global: 100 requests per 15 minutes per IP
 * - Vote submission: 10 requests per minute per IP
 * - Poll creation: 5 requests per hour per IP
 *
 * Note: Redis store is lazy-loaded to avoid initialization order issues
 */

/**
 * Get Redis store for rate limiter (lazy-loaded)
 * @param {string} prefix - Redis key prefix
 * @returns {RedisStore} Redis store instance
 */
function getRedisStore(prefix) {
  try {
    return new RedisStore({
      client: getRedisClient(),
      prefix,
    });
  } catch {
    return undefined; // express-rate-limit will use default MemoryStore
  }
}

/**
 * Global rate limiter - applies to all requests
 * 100 requests per 15 minutes
 */
const globalRateLimiter = rateLimit({
  store: getRedisStore('rl:global:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    // Track metrics (T069)
    rateLimitExceeded.labels('global').inc();

    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        rateLimitType: 'global',
      },
      'Rate limit exceeded'
    );

    // Log to audit_logs table (async, non-blocking)
    AuditLogRepository.logEvent({
      eventType: 'rate_limit_exceeded',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        rateLimitType: 'global',
        path: req.path,
        method: req.method,
      },
    }).catch(error => {
      logger.error({ error: error.message }, 'Failed to log rate limit violation to audit_logs');
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Vote submission rate limiter
 * 10 requests per minute
 */
const voteRateLimiter = rateLimit({
  store: getRedisStore('rl:vote:'),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    error: 'Too many vote submissions, please slow down',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  handler: (req, res) => {
    // Track metrics (T069)
    rateLimitExceeded.labels('vote').inc();

    logger.warn(
      {
        ip: req.ip,
        roomCode: req.body?.roomCode,
        rateLimitType: 'vote',
      },
      'Vote rate limit exceeded'
    );

    // Log to audit_logs table (async, non-blocking)
    AuditLogRepository.logEvent({
      eventType: 'rate_limit_exceeded',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        rateLimitType: 'vote',
        roomCode: req.body?.roomCode,
      },
    }).catch(error => {
      logger.error(
        { error: error.message },
        'Failed to log vote rate limit violation to audit_logs'
      );
    });

    res.status(429).json({
      error: 'Too many vote submissions, please slow down',
      retryAfter: '1 minute',
    });
  },
});

/**
 * Poll creation rate limiter
 * 5 requests per hour (production)
 * Higher limit in test environment unless RATE_LIMIT_TESTING=true
 */
const pollCreationRateLimiter = rateLimit({
  store: getRedisStore('rl:poll:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TESTING !== 'true' ? 1000 : 5,
  message: {
    error: 'Too many polls created, please try again later',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Track metrics (T069)
    rateLimitExceeded.labels('poll_creation').inc();

    logger.warn(
      {
        ip: req.ip,
        question: req.body?.question,
        rateLimitType: 'pollCreation',
      },
      'Poll creation rate limit exceeded'
    );

    // Log to audit_logs table (async, non-blocking)
    AuditLogRepository.logEvent({
      eventType: 'rate_limit_exceeded',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        rateLimitType: 'pollCreation',
        question: req.body?.question?.substring(0, 50), // First 50 chars only
      },
    }).catch(error => {
      logger.error(
        { error: error.message },
        'Failed to log poll creation rate limit violation to audit_logs'
      );
    });

    res.status(429).json({
      error: 'Too many polls created, please try again later',
      retryAfter: '1 hour',
    });
  },
});

module.exports = {
  globalRateLimiter,
  voteRateLimiter,
  pollCreationRateLimiter,
};
