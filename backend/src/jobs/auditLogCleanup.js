/**
 * Audit Log Cleanup Job
 * Hard-deletes old audit logs beyond retention period
 * Runs weekly on Sunday at 3am (configurable via cron schedule)
 */

const { getPool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Execute audit log cleanup job
 * Permanently deletes audit logs older than retention period (default 90 days)
 * @param {number} retentionDays - Number of days to retain audit logs (default: 90)
 * @returns {Promise<{deletedCount: number}>}
 */
async function executeAuditLogCleanup(retentionDays = 90) {
  const pool = getPool();
  const startTime = Date.now();

  try {
    logger.info({ retentionDays }, 'Starting audit log cleanup job');

    // Hard delete old audit logs
    const result = await pool.query(
      `DELETE FROM audit_logs
       WHERE created_at < NOW() - INTERVAL '1 day' * $1
       RETURNING id`,
      [retentionDays],
    );

    const deletedCount = result.rowCount;
    const duration = Date.now() - startTime;

    logger.info(
      { deletedCount, retentionDays, duration },
      `Audit log cleanup completed - deleted ${deletedCount} log(s) older than ${retentionDays} days`,
    );

    return { deletedCount };
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      'Audit log cleanup job failed',
    );
    throw error;
  }
}

module.exports = {
  executeAuditLogCleanup,
};
