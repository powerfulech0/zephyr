/**
 * Participant Cleanup Job
 * Marks stale participants as disconnected
 * Runs hourly (configurable via cron schedule)
 */

const { getPool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Execute participant cleanup job
 * Marks participants as disconnected if they haven't been seen within timeout period
 * @param {number} timeoutMinutes - Number of minutes of inactivity before marking disconnected (default: 30)
 * @returns {Promise<{updatedCount: number}>}
 */
async function executeParticipantCleanup(timeoutMinutes = 30) {
  const pool = getPool();
  const startTime = Date.now();

  try {
    logger.info({ timeoutMinutes }, 'Starting participant cleanup job');

    // Mark stale participants as disconnected
    const result = await pool.query(
      `UPDATE participants
       SET is_connected = false,
           socket_id = NULL
       WHERE last_seen_at < NOW() - INTERVAL '1 minute' * $1
         AND is_connected = true
       RETURNING id, nickname, poll_id`,
      [timeoutMinutes],
    );

    const updatedCount = result.rowCount;
    const duration = Date.now() - startTime;

    if (updatedCount > 0) {
      const disconnectedParticipants = result.rows.map(row => ({
        id: row.id,
        nickname: row.nickname,
        pollId: row.poll_id,
      }));

      logger.info(
        { updatedCount, timeoutMinutes, duration, participants: disconnectedParticipants },
        `Participant cleanup completed - marked ${updatedCount} participant(s) as disconnected`,
      );
    } else {
      logger.debug(
        { timeoutMinutes, duration },
        'Participant cleanup completed - no stale participants found',
      );
    }

    return { updatedCount };
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      'Participant cleanup job failed',
    );
    throw error;
  }
}

module.exports = {
  executeParticipantCleanup,
};
