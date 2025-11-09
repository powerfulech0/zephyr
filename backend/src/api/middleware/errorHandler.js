const { errorsTotal, httpErrorsTotal } = require('../../services/metricsService');

const errorHandler = (err, req, res, _next) => {
  req.log.error(
    {
      err,
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
    'Request error'
  );

  const statusCode = err.statusCode || 500;

  // Track error metrics (T070)
  const route = req.route?.path || req.path || 'unknown';
  const errorType = statusCode >= 500 ? 'server_error' : 'client_error';

  errorsTotal.labels(errorType, 'http').inc();
  httpErrorsTotal.labels(errorType, route).inc();

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
