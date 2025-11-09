const {
  httpRequestDuration,
  httpRequestsTotal,
} = require('../../services/metricsService');

/**
 * Metrics middleware to instrument HTTP requests
 * Tracks request duration and count by method, route, and status code
 *
 * Implements FR-017: HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  });

  next();
}

module.exports = metricsMiddleware;
