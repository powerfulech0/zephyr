const configureRedisAdapter = require('@socket.io/redis-adapter');
const cron = require('node-cron');

const { initializePool, getPool } = require('../config/database.js');
const { initializeRedis } = require('../config/cache.js');
const { executePollCleanup } = require('../jobs/pollCleanup.js');
const { executeAuditLogCleanup } = require('../jobs/auditLogCleanup.js');
const { executeParticipantCleanup } = require('../jobs/participantCleanup.js');
const { initializePollRoutes } = require('../api/routes/pollRoutes.js');
const authRoutes = require('../api/routes/authRoutes.js');
const initializeSocketHandler = require('../sockets/socketHandler.js');
const PollService = require('../services/pollService.js');
const logger = require('../config/logger.js');

/**
 * Initialize infrastructure connections (database, Redis)
 * @returns {Promise<void>}
 */
async function initializeInfrastructure(io, app) {
  try {
    // Initialize all
    initializePool();
    initializeRedis();
    configureRedisAdapter(io);

    // Initialize PollService with database pool
    const dbPool = getPool();
    const pollService = new PollService(dbPool);
    logger.info('PollService initialized');

    // Restore active polls from database on startup (zero data loss)
    const activePolls = await pollService.restoreActivePolls();
    logger.info({ count: activePolls.length }, 'Active polls restored from database');

    // Initialize scheduled cleanup jobs (T137-T142)
    if (process.env.CLEANUP_ENABLED !== 'false') {
      const retentionDays = parseInt(process.env.POLL_RETENTION_DAYS || '30', 10);
      const auditRetentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);
      const participantTimeoutMinutes = parseInt(
        process.env.PARTICIPANT_TIMEOUT_MINUTES || '30',
        10
      );

      // Poll cleanup: Daily at 2am
      cron.schedule('0 2 * * *', async () => {
        logger.info('Running scheduled poll cleanup job');
        try {
          await executePollCleanup();
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled poll cleanup failed');
        }
      });

      // Audit log cleanup: Weekly on Sunday at 3am
      cron.schedule('0 3 * * 0', async () => {
        logger.info('Running scheduled audit log cleanup job');
        try {
          await executeAuditLogCleanup(auditRetentionDays);
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled audit log cleanup failed');
        }
      });

      // Participant cleanup: Hourly
      cron.schedule('0 * * * *', async () => {
        logger.debug('Running scheduled participant cleanup job');
        try {
          await executeParticipantCleanup(participantTimeoutMinutes);
        } catch (error) {
          logger.error({ error: error.message }, 'Scheduled participant cleanup failed');
        }
      });

      logger.info(
        {
          pollRetentionDays: retentionDays,
          auditRetentionDays,
          participantTimeoutMinutes,
        },
        'Scheduled cleanup jobs initialized'
      );
    } else {
      logger.info('Cleanup jobs disabled via CLEANUP_ENABLED=false');
    }

    // Initialize routes and socket handlers with pollService
    app.use('/api/auth', authRoutes); // Authentication routes (T054)
    app.use('/api', initializePollRoutes(pollService));
    initializeSocketHandler(io, pollService);

    return {
      app,
      pollService,
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Infrastructure initialization failed');
    throw error;
  }
}

module.exports = { initializeInfrastructure };
