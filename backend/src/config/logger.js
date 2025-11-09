const pino = require('pino');

/**
 * Enhanced Pino logger with correlation ID support and structured logging
 * Supports runtime log level changes (FR-021)
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
    bindings(bindings) {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_env: process.env.NODE_ENV || 'development',
      };
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with correlation ID
 * @param {string} correlationId - Unique request correlation ID
 * @returns {pino.Logger} Child logger instance
 */
logger.withCorrelationId = function (correlationId) {
  return this.child({ correlationId });
};

/**
 * Change log level at runtime (FR-021)
 * @param {string} level - New log level (trace, debug, info, warn, error, fatal)
 */
logger.setLevel = function (level) {
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid log level: ${level}. Must be one of: ${validLevels.join(', ')}`);
  }
  this.level = level;
  this.info({ newLevel: level }, 'Log level changed');
};

/**
 * Get current log level
 * @returns {string} Current log level
 */
logger.getLevel = function () {
  return this.level;
};

module.exports = logger;
