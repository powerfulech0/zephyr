/**
 * Poll Cleanup Job
 * Soft-deletes expired polls by setting is_active = false
 * Runs daily at 2am (configurable via cron schedule)
 */

const { getPool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Execute poll cleanup job
 * Marks polls as inactive (soft delete) when they exceed retention period
 * @returns {Promise<{deletedCount: number, polls: Array}>}
 */
async function executePollCleanup() {
  const pool = getPool();
  const startTime = Date.now();

  try {
    logger.info('Starting poll cleanup job');

    // Soft delete expired polls
    const result = await pool.query(
      `UPDATE polls
       SET is_active = false
       WHERE expires_at < NOW()
         AND is_active = true
       RETURNING id, room_code, expires_at`,
    );

    const deletedCount = result.rowCount;
    const deletedPolls = result.rows.map(row => ({
      id: row.id,
      roomCode: row.room_code,
      expiredAt: row.expires_at,
    }));

    const duration = Date.now() - startTime;

    logger.info(
      { deletedCount, duration, polls: deletedPolls },
      `Poll cleanup completed - marked ${deletedCount} poll(s) as inactive`,
    );

    return { deletedCount, polls: deletedPolls };
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Poll cleanup job failed');
    throw error;
  }
}

module.exports = {
  executePollCleanup,
};
