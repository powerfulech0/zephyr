/**
 * Migration: 002 Audit Logs
 * Creates audit_logs table for security event logging (User Story 2 - Security)
 *
 * Purpose: Track security-relevant events for monitoring and incident response
 * - Rate limit violations
 * - Invalid input attempts
 * - Unauthorized actions
 * - Other security events
 *
 * Retention: 90 days (requires scheduled cleanup job)
 */

/**
 * Run the migration - create audit_logs table
 */
exports.up = async function (db) {
  await db.runSql(`
    -- Create audit_logs table for security event logging
    CREATE TABLE audit_logs (
      id BIGSERIAL PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      ip_address INET,
      user_agent TEXT,
      poll_id INTEGER REFERENCES polls(id) ON DELETE SET NULL,
      participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Index for security event queries (by type, time range)
    CREATE INDEX idx_audit_logs_event_type_created_at
      ON audit_logs(event_type, created_at DESC);

    -- Index for IP-based analysis (detect repeated violations)
    CREATE INDEX idx_audit_logs_ip_address_created_at
      ON audit_logs(ip_address, created_at DESC);

    -- Table comments
    COMMENT ON TABLE audit_logs IS
      'Security and operational audit log. Retention: 90 days.';
    COMMENT ON COLUMN audit_logs.event_type IS
      'Categorizes event for filtering and alerting';
    COMMENT ON COLUMN audit_logs.details IS
      'Flexible JSON storage for event-specific context';
  `);
};

/**
 * Rollback the migration - drop audit_logs table
 */
exports.down = async function (db) {
  await db.runSql(`
    DROP TABLE IF EXISTS audit_logs CASCADE;
  `);
};

exports._meta = {
  version: 1,
};
