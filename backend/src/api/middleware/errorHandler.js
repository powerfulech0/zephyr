const logger = require('../../config/logger.js');

const errorHandler = (err, req, res, next) => {
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
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
