const express = require('express');
const { getMetrics, getContentType } = require('../../services/metricsService');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 *
 * Returns metrics in Prometheus text-based exposition format
 * Should be restricted to internal network or require authentication in production
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getContentType());
    res.send(metrics);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to fetch metrics');
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

module.exports = router;
