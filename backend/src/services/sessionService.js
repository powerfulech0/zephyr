const { getRedis } = require('../config/cache');
const logger = require('../config/logger');

/**
 * Session Service for Distributed State Management (T099)
 *
 * Stores participant session state in Redis for cross-instance access.
 * Enables participants to reconnect to different backend instances
 * while maintaining their session data.
 *
 * Session Data Structure:
 * {
 *   socketId: string,     // Current socket.io connection ID
 *   pollId: string,       // Room code of joined poll
 *   nickname: string,     // Participant nickname
 *   lastSeen: timestamp,  // Last activity timestamp
 *   voteIndex: number     // Index of voted option (null if no vote)
 * }
 *
 * TTL: 1 hour (sessions expire after inactivity)
 */

const SESSION_TTL = 3600; // 1 hour in seconds
const SESSION_PREFIX = 'session:participant:';

/**
 * Store participant session in Redis
 * @param {string} participantId - Unique participant identifier (e.g., socket.id or user ID)
 * @param {Object} sessionData - Session data to store
 * @param {string} sessionData.socketId - Current socket ID
 * @param {string} sessionData.pollId - Poll room code
 * @param {string} sessionData.nickname - Participant nickname
 * @param {number|null} sessionData.voteIndex - Voted option index
 * @returns {Promise<boolean>} Success status
 */
async function storeSession(participantId, sessionData) {
  try {
    const redis = getRedis();
    if (!redis) {
      logger.warn('Redis not available, session will not persist across instances');
      return false;
    }

    const key = `${SESSION_PREFIX}${participantId}`;
    const data = {
      ...sessionData,
      lastSeen: Date.now(),
    };

    await redis.set(key, JSON.stringify(data), 'EX', SESSION_TTL);

    logger.debug(
      {
        participantId,
        pollId: sessionData.pollId,
        nickname: sessionData.nickname,
      },
      'Session stored in Redis'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        participantId,
      },
      'Failed to store session in Redis'
    );
    return false;
  }
}

/**
 * Retrieve participant session from Redis
 * @param {string} participantId - Unique participant identifier
 * @returns {Promise<Object|null>} Session data or null if not found
 */
async function getSession(participantId) {
  try {
    const redis = getRedis();
    if (!redis) {
      return null;
    }

    const key = `${SESSION_PREFIX}${participantId}`;
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    logger.error(
      {
        error: error.message,
        participantId,
      },
      'Failed to retrieve session from Redis'
    );
    return null;
  }
}

/**
 * Update participant session (refresh TTL)
 * @param {string} participantId - Unique participant identifier
 * @param {Object} updates - Partial session data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateSession(participantId, updates) {
  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    // Get existing session
    const existingSession = await getSession(participantId);
    if (!existingSession) {
      logger.warn({ participantId }, 'Cannot update non-existent session');
      return false;
    }

    // Merge updates
    const updatedSession = {
      ...existingSession,
      ...updates,
      lastSeen: Date.now(),
    };

    const key = `${SESSION_PREFIX}${participantId}`;
    await redis.set(key, JSON.stringify(updatedSession), 'EX', SESSION_TTL);

    logger.debug(
      {
        participantId,
        updates: Object.keys(updates),
      },
      'Session updated in Redis'
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        participantId,
      },
      'Failed to update session in Redis'
    );
    return false;
  }
}

/**
 * Delete participant session from Redis
 * @param {string} participantId - Unique participant identifier
 * @returns {Promise<boolean>} Success status
 */
async function deleteSession(participantId) {
  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const key = `${SESSION_PREFIX}${participantId}`;
    await redis.del(key);

    logger.debug({ participantId }, 'Session deleted from Redis');

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        participantId,
      },
      'Failed to delete session from Redis'
    );
    return false;
  }
}

/**
 * Get all active sessions for a poll
 * @param {string} pollId - Poll room code
 * @returns {Promise<Array>} Array of session data objects
 */
async function getPollSessions(pollId) {
  try {
    const redis = getRedis();
    if (!redis) {
      return [];
    }

    // Scan for all session keys
    const keys = await redis.keys(`${SESSION_PREFIX}*`);

    if (keys.length === 0) {
      return [];
    }

    // Get all session data
    const sessions = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    // Filter by poll ID
    return sessions.filter((session) => session && session.pollId === pollId);
  } catch (error) {
    logger.error(
      {
        error: error.message,
        pollId,
      },
      'Failed to get poll sessions from Redis'
    );
    return [];
  }
}

/**
 * Refresh session TTL (extend expiration)
 * @param {string} participantId - Unique participant identifier
 * @returns {Promise<boolean>} Success status
 */
async function refreshSession(participantId) {
  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const key = `${SESSION_PREFIX}${participantId}`;
    const exists = await redis.exists(key);

    if (!exists) {
      return false;
    }

    await redis.expire(key, SESSION_TTL);

    logger.debug({ participantId }, 'Session TTL refreshed');

    return true;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        participantId,
      },
      'Failed to refresh session TTL'
    );
    return false;
  }
}

/**
 * Clean up expired sessions (runs periodically)
 * Note: Redis handles expiration automatically via TTL,
 * but this can be used for additional cleanup logic if needed
 * @returns {Promise<number>} Number of sessions cleaned up
 */
async function cleanupExpiredSessions() {
  try {
    const redis = getRedis();
    if (!redis) {
      return 0;
    }

    const keys = await redis.keys(`${SESSION_PREFIX}*`);

    if (keys.length === 0) {
      return 0;
    }

    const now = Date.now();
    const oneHourAgo = now - SESSION_TTL * 1000;

    let cleanedCount = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const key of keys) {
      // eslint-disable-next-line no-await-in-loop
      const data = await redis.get(key);
      // eslint-disable-next-line no-continue
      if (!data) continue;

      const session = JSON.parse(data);
      if (session.lastSeen < oneHourAgo) {
        // eslint-disable-next-line no-await-in-loop
        await redis.del(key);
        cleanedCount += 1;
      }
    }

    if (cleanedCount > 0) {
      logger.info({ count: cleanedCount }, 'Cleaned up expired sessions');
    }

    return cleanedCount;
  } catch (error) {
    logger.error(
      {
        error: error.message,
      },
      'Failed to cleanup expired sessions'
    );
    return 0;
  }
}

module.exports = {
  storeSession,
  getSession,
  updateSession,
  deleteSession,
  getPollSessions,
  refreshSession,
  cleanupExpiredSessions,
  SESSION_TTL,
};
