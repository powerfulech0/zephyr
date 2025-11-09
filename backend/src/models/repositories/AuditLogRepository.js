const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Repository for audit_logs table
 * Handles security event logging for monitoring and incident response
 *
 * Event Types:
 * - rate_limit_exceeded: Rate limit violation
 * - invalid_input: Invalid or malicious input attempt
 * - unauthorized_action: Unauthorized access attempt
 * - validation_failed: Request validation failure
 */
class AuditLogRepository {
  /**
   * Log a security event to the audit log
   * @param {Object} event - Event data
   * @param {string} event.eventType - Type of event (e.g., 'rate_limit_exceeded')
   * @param {string} [event.ipAddress] - Client IP address
   * @param {string} [event.userAgent] - Client user agent
   * @param {number} [event.pollId] - Related poll ID (if applicable)
   * @param {number} [event.participantId] - Related participant ID (if applicable)
   * @param {Object} [event.details] - Additional event-specific details (JSON)
   * @returns {Promise<Object>} Created audit log entry
   */
  static async logEvent({ eventType, ipAddress, userAgent, pollId, participantId, details }) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `INSERT INTO audit_logs
         (event_type, ip_address, user_agent, poll_id, participant_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, event_type, created_at`,
        [eventType, ipAddress || null, userAgent || null, pollId || null, participantId || null, details ? JSON.stringify(details) : null]
      );

      logger.info(
        {
          auditLogId: result.rows[0].id,
          eventType,
          ipAddress,
          pollId,
          participantId,
        },
        'Security event logged to audit_logs'
      );

      return result.rows[0];
    } catch (error) {
      // Log error but don't throw - audit logging failures shouldn't break the application
      logger.error(
        {
          error: error.message,
          eventType,
          ipAddress,
        },
        'Failed to log security event to audit_logs'
      );
      return null;
    }
  }

  /**
   * Get audit logs by event type
   * @param {string} eventType - Type of event to filter by
   * @param {Object} options - Query options
   * @param {number} [options.limit=100] - Maximum number of records to return
   * @param {Date} [options.startDate] - Start date filter
   * @param {Date} [options.endDate] - End date filter
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async getByEventType(eventType, options = {}) {
    const pool = getPool();
    const { limit = 100, startDate, endDate } = options;

    try {
      let query = 'SELECT * FROM audit_logs WHERE event_type = $1';
      const params = [eventType];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex += 1;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex += 1;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error({ error: error.message, eventType }, 'Failed to fetch audit logs by event type');
      throw error;
    }
  }

  /**
   * Get audit logs by IP address
   * @param {string} ipAddress - IP address to filter by
   * @param {Object} options - Query options
   * @param {number} [options.limit=100] - Maximum number of records to return
   * @param {Date} [options.startDate] - Start date filter
   * @returns {Promise<Array>} Array of audit log entries
   */
  static async getByIpAddress(ipAddress, options = {}) {
    const pool = getPool();
    const { limit = 100, startDate } = options;

    try {
      let query = 'SELECT * FROM audit_logs WHERE ip_address = $1';
      const params = [ipAddress];

      if (startDate) {
        query += ' AND created_at >= $2';
        params.push(startDate);
        query += ' ORDER BY created_at DESC LIMIT $3';
        params.push(limit);
      } else {
        query += ' ORDER BY created_at DESC LIMIT $2';
        params.push(limit);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error({ error: error.message, ipAddress }, 'Failed to fetch audit logs by IP address');
      throw error;
    }
  }

  /**
   * Delete audit logs older than specified days (for retention policy)
   * @param {number} days - Delete logs older than this many days
   * @returns {Promise<number>} Number of rows deleted
   */
  static async deleteOlderThan(days) {
    const pool = getPool();

    try {
      const result = await pool.query(
        'DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL \'1 day\' * $1',
        [days]
      );

      logger.info(
        {
          deletedCount: result.rowCount,
          retentionDays: days,
        },
        'Deleted old audit logs per retention policy'
      );

      return result.rowCount;
    } catch (error) {
      logger.error({ error: error.message, days }, 'Failed to delete old audit logs');
      throw error;
    }
  }
}

module.exports = AuditLogRepository;
