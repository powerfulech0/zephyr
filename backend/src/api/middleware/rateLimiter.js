const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../../config/cache');
const logger = require('../../config/logger');

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
  } catch (error) {
    // Fall back to memory store if Redis not available
    logger.warn({ prefix }, 'Redis not available for rate limiting, using memory store');
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
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        rateLimitType: 'global',
      },
      'Rate limit exceeded'
    );
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
    logger.warn(
      {
        ip: req.ip,
        roomCode: req.body?.roomCode,
        rateLimitType: 'vote',
      },
      'Vote rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too many vote submissions, please slow down',
      retryAfter: '1 minute',
    });
  },
});

/**
 * Poll creation rate limiter
 * 5 requests per hour
 */
const pollCreationRateLimiter = rateLimit({
  store: getRedisStore('rl:poll:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  message: {
    error: 'Too many polls created, please try again later',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      {
        ip: req.ip,
        question: req.body?.question,
        rateLimitType: 'pollCreation',
      },
      'Poll creation rate limit exceeded'
    );
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
