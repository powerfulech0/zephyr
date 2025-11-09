const express = require('express');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * GET /api/config/log-level
 *
 * Get current log level
 * Requires authentication in production (internal network or admin role)
 *
 * Response: { level: "info" }
 */
router.get('/log-level', (req, res) => {
  try {
    const currentLevel = logger.getLevel();

    res.json({
      level: currentLevel,
      validLevels: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'],
    });
  } catch (error) {
    logger.error({ error: error.message, correlationId: req.correlationId }, 'Failed to get log level');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve log level',
    });
  }
});

/**
 * PUT /api/config/log-level
 *
 * Change log level at runtime without restart
 * Requires authentication in production (internal network or admin role)
 *
 * Body: { level: "debug" }
 * Response: { level: "debug", previousLevel: "info", message: "Log level updated successfully" }
 */
router.put('/log-level', (req, res) => {
  try {
    const { level } = req.body;

    // Validation
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
    if (!level) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: level',
        validLevels,
      });
    }

    if (!validLevels.includes(level)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid log level: ${level}`,
        validLevels,
      });
    }

    const previousLevel = logger.getLevel();

    // Change log level
    logger.setLevel(level);

    logger.info(
      {
        correlationId: req.correlationId,
        previousLevel,
        newLevel: level,
        changedBy: req.ip,
      },
      'Log level changed via API'
    );

    res.json({
      level,
      previousLevel,
      message: 'Log level updated successfully',
    });
  } catch (error) {
    logger.error(
      {
        error: error.message,
        correlationId: req.correlationId,
      },
      'Failed to update log level'
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update log level',
    });
  }
});

/**
 * POST /api/config/log-level/reset
 *
 * Reset log level to default (from environment variable or 'info')
 *
 * Response: { level: "info", message: "Log level reset to default" }
 */
router.post('/log-level/reset', (req, res) => {
  try {
    const defaultLevel = process.env.LOG_LEVEL || 'info';
    const previousLevel = logger.getLevel();

    logger.setLevel(defaultLevel);

    logger.info(
      {
        correlationId: req.correlationId,
        previousLevel,
        newLevel: defaultLevel,
        changedBy: req.ip,
      },
      'Log level reset to default'
    );

    res.json({
      level: defaultLevel,
      previousLevel,
      message: 'Log level reset to default',
    });
  } catch (error) {
    logger.error(
      {
        error: error.message,
        correlationId: req.correlationId,
      },
      'Failed to reset log level'
    );

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset log level',
    });
  }
});

module.exports = router;
