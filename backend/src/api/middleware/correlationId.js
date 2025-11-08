const { nanoid } = require('nanoid');
const logger = require('../../config/logger');

/**
 * Correlation ID middleware
 * Assigns a unique correlation ID to each request for distributed tracing (FR-016)
 * Propagates the correlation ID through the request lifecycle and all log entries
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
function correlationIdMiddleware(req, res, next) {
  // Check if correlation ID already exists (from upstream proxy/load balancer)
  const correlationId = req.headers['x-correlation-id'] || nanoid(16);

  // Attach correlation ID to request object
  req.correlationId = correlationId;

  // Create child logger with correlation ID for this request
  req.logger = logger.withCorrelationId(correlationId);

  // Add correlation ID to response headers for client tracking
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}

module.exports = correlationIdMiddleware;
