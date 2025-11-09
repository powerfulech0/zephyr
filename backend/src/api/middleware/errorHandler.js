const { errorsTotal, httpErrorsTotal } = require('../../services/metricsService');

/**
 * User-friendly error messages mapping (T119)
 * Maps technical error codes to human-readable messages with helpful suggestions
 */
const ERROR_MESSAGES = {
  // Database errors
  ETIMEDOUT: {
    message: 'The request took too long to process',
    suggestion: 'Please try again in a moment',
  },
  ECONNREFUSED: {
    message: 'Unable to connect to the database',
    suggestion: 'Please try again later',
  },
  ECONNRESET: {
    message: 'Connection was interrupted',
    suggestion: 'Please try your request again',
  },

  // Circuit breaker errors
  CIRCUIT_BREAKER_OPEN: {
    message: 'Service is temporarily unavailable',
    suggestion: 'We are experiencing high load. Please try again in a few moments',
  },

  // Validation errors
  VALIDATION_ERROR: {
    message: 'Invalid request data',
    suggestion: 'Please check your input and try again',
  },

  // Authentication errors
  UNAUTHORIZED: {
    message: 'Authentication required',
    suggestion: 'Please log in and try again',
  },
  FORBIDDEN: {
    message: 'You do not have permission to perform this action',
    suggestion: 'Contact support if you believe this is an error',
  },

  // Resource errors
  NOT_FOUND: {
    message: 'The requested resource was not found',
    suggestion: 'Please check the URL and try again',
  },
  CONFLICT: {
    message: 'This action conflicts with existing data',
    suggestion: 'The resource may have been modified. Please refresh and try again',
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    message: 'Too many requests',
    suggestion: 'Please wait a moment before trying again',
  },
};

/**
 * Enhanced error handler with user-friendly messages (T119)
 */
const errorHandler = (err, req, res, _next) => {
  req.log.error(
    {
      err,
      method: req.method,
      url: req.url,
      ip: req.ip,
      correlationId: req.correlationId,
    },
    'Request error'
  );

  const statusCode = err.statusCode || 500;

  // Track error metrics (T070)
  const route = req.route?.path || req.path || 'unknown';
  const errorType = statusCode >= 500 ? 'server_error' : 'client_error';

  errorsTotal.labels(errorType, 'http').inc();
  httpErrorsTotal.labels(errorType, route).inc();

  // Determine user-friendly message
  let userMessage;
  let suggestion;

  if (err.code && ERROR_MESSAGES[err.code]) {
    // Use mapped error message for known error codes
    userMessage = ERROR_MESSAGES[err.code].message;
    suggestion = ERROR_MESSAGES[err.code].suggestion;
  } else if (statusCode === 400) {
    userMessage = err.message || 'Invalid request';
    suggestion = 'Please check your input and try again';
  } else if (statusCode === 401) {
    userMessage = ERROR_MESSAGES.UNAUTHORIZED.message;
    suggestion = ERROR_MESSAGES.UNAUTHORIZED.suggestion;
  } else if (statusCode === 403) {
    userMessage = ERROR_MESSAGES.FORBIDDEN.message;
    suggestion = ERROR_MESSAGES.FORBIDDEN.suggestion;
  } else if (statusCode === 404) {
    userMessage = ERROR_MESSAGES.NOT_FOUND.message;
    suggestion = ERROR_MESSAGES.NOT_FOUND.suggestion;
  } else if (statusCode === 409) {
    userMessage = ERROR_MESSAGES.CONFLICT.message;
    suggestion = ERROR_MESSAGES.CONFLICT.suggestion;
  } else if (statusCode === 429) {
    userMessage = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED.message;
    suggestion = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED.suggestion;
  } else if (statusCode >= 500) {
    userMessage = 'An unexpected error occurred';
    suggestion = 'Our team has been notified. Please try again later';
  } else {
    userMessage = err.message || 'An error occurred';
    suggestion = 'Please try again';
  }

  // Build response
  const response = {
    success: false,
    error: {
      message: userMessage,
      suggestion,
    },
  };

  // Include error code for tracking
  if (err.code) {
    response.error.code = err.code;
  }

  // Include correlation ID for support
  if (req.correlationId) {
    response.error.correlationId = req.correlationId;
  }

  // Include technical details in development
  if (process.env.NODE_ENV !== 'production') {
    response.error.technical = {
      message: err.message,
      stack: err.stack,
    };
  }

  // Include validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    response.error.validationErrors = err.errors;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
