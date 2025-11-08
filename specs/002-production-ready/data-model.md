# Data Model: Production-Ready Infrastructure

**Feature**: 002-production-ready
**Date**: 2025-11-07
**Database**: PostgreSQL 14+

## Overview

This data model migrates the existing in-memory `PollManager` to PostgreSQL, enabling data persistence (FR-001 through FR-006) while maintaining real-time WebSocket performance.

**Design Principles**:
- **Normalized schema**: Separate tables for Polls, Participants, Votes to avoid data duplication and ensure referential integrity
- **Indexed lookups**: Room code lookups must be fast (<10ms) to support real-time joins
- **ACID transactions**: Vote submissions use transactions to prevent double-counting
- **Soft deletes**: Polls marked inactive rather than deleted (supports data retention policy FR-005)
- **Timestamps**: All entities track creation/update times for audit and cleanup

---

## Entity Relationship Diagram

```text
┌─────────────────┐
│      polls      │
├─────────────────┤
│ id (PK)         │
│ room_code (UK)  │──┐
│ question        │  │
│ options (JSON)  │  │
│ state           │  │
│ created_at      │  │
│ expires_at      │  │
│ is_active       │  │
└─────────────────┘  │
                     │
          ┌──────────┴────────────┐
          │                       │
          │                       │
┌─────────▼───────┐     ┌─────────▼──────┐
│  participants   │     │     votes      │
├─────────────────┤     ├────────────────┤
│ id (PK)         │◄────│ id (PK)        │
│ poll_id (FK)    │     │ participant_id │
│ nickname (UK)   │     │ option_index   │
│ socket_id       │     │ voted_at       │
│ joined_at       │     │ updated_at     │
│ last_seen_at    │     └────────────────┘
│ is_connected    │
└─────────────────┘
```

---

## Table Schemas

### 1. `polls`

Stores poll questions, options, and state.

```sql
CREATE TABLE polls (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  question VARCHAR(200) NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_array_length(options) BETWEEN 2 AND 5),
  state VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting', 'open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index for room code lookup (primary access pattern)
CREATE UNIQUE INDEX idx_polls_room_code_active ON polls(room_code) WHERE is_active = true;

-- Index for cleanup job (find expired polls)
CREATE INDEX idx_polls_expires_at ON polls(expires_at) WHERE is_active = true;

-- Comments
COMMENT ON TABLE polls IS 'Stores poll questions, options, and lifecycle state';
COMMENT ON COLUMN polls.room_code IS 'Unique 6-character room code for participant access';
COMMENT ON COLUMN polls.options IS 'Array of 2-5 answer options stored as JSON';
COMMENT ON COLUMN polls.state IS 'Poll lifecycle: waiting (created), open (voting allowed), closed (voting ended)';
COMMENT ON COLUMN polls.expires_at IS 'Automatic expiration date (default 30 days from creation)';
COMMENT ON COLUMN polls.is_active IS 'Soft delete flag. Inactive polls excluded from queries but retained for auditing';
```

**Validation Rules** (enforced in application layer):
- `question`: 5-200 characters
- `options`: Array of 2-5 strings, each 1-100 characters
- `room_code`: 6 uppercase alphanumeric characters (23456789ABCDEFGHJKLMNPQRSTUVWXYZ alphabet)

**Example Row**:
```json
{
  "id": 42,
  "room_code": "3B7KWX",
  "question": "What is your favorite programming language?",
  "options": ["JavaScript", "Python", "Go", "Rust"],
  "state": "open",
  "created_at": "2025-11-07T10:30:00Z",
  "expires_at": "2025-12-07T10:30:00Z",
  "is_active": true
}
```

---

### 2. `participants`

Stores participants who have joined polls.

```sql
CREATE TABLE participants (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  socket_id VARCHAR(100), -- Current Socket.io connection ID (null if disconnected)
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_connected BOOLEAN NOT NULL DEFAULT true,

  -- Unique constraint: one nickname per poll
  CONSTRAINT uk_participants_poll_nickname UNIQUE (poll_id, nickname)
);

-- Index for poll participant lookup (fetch all participants in a poll)
CREATE INDEX idx_participants_poll_id ON participants(poll_id) WHERE is_connected = true;

-- Index for socket_id lookup (find participant by socket connection)
CREATE INDEX idx_participants_socket_id ON participants(socket_id) WHERE socket_id IS NOT NULL;

-- Comments
COMMENT ON TABLE participants IS 'Tracks participants who have joined polls';
COMMENT ON COLUMN participants.nickname IS 'Display name chosen by participant. Unique within each poll.';
COMMENT ON COLUMN participants.socket_id IS 'Current Socket.io connection ID. NULL when disconnected.';
COMMENT ON COLUMN participants.last_seen_at IS 'Last activity timestamp. Used for session timeout detection.';
COMMENT ON COLUMN participants.is_connected IS 'Connection status. False when participant disconnects.';
```

**Validation Rules** (enforced in application layer):
- `nickname`: 2-50 characters, alphanumeric + spaces + basic punctuation
- Uniqueness enforced per poll (database constraint)

**Example Row**:
```json
{
  "id": 123,
  "poll_id": 42,
  "nickname": "Alice",
  "socket_id": "g4hT9kL2mN5pQ8rS",
  "joined_at": "2025-11-07T10:35:00Z",
  "last_seen_at": "2025-11-07T10:40:15Z",
  "is_connected": true
}
```

---

### 3. `votes`

Stores participant votes. One vote per participant (updated when vote changes).

```sql
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index BETWEEN 0 AND 4),
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one vote per participant
  CONSTRAINT uk_votes_participant UNIQUE (participant_id)
);

-- Index for vote counting by poll (join participants → votes to aggregate)
CREATE INDEX idx_votes_participant_id ON votes(participant_id);

-- Comments
COMMENT ON TABLE votes IS 'Stores participant votes. One row per participant, updated when vote changes.';
COMMENT ON COLUMN votes.option_index IS 'Zero-based index into polls.options array (0-4 for 2-5 options)';
COMMENT ON COLUMN votes.voted_at IS 'Timestamp of initial vote submission';
COMMENT ON COLUMN votes.updated_at IS 'Timestamp of last vote change (same as voted_at if never changed)';
```

**Example Row**:
```json
{
  "id": 456,
  "participant_id": 123,
  "option_index": 2,
  "voted_at": "2025-11-07T10:36:00Z",
  "updated_at": "2025-11-07T10:38:30Z"
}
```

---

### 4. `audit_logs` (Optional - for P2 Security)

Stores security-relevant events for auditing (FR-012).

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'rate_limit_exceeded', 'invalid_input', 'unauthorized_action', etc.
  ip_address INET,
  user_agent TEXT,
  poll_id INTEGER REFERENCES polls(id) ON DELETE SET NULL,
  participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  details JSONB, -- Flexible storage for event-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for security event queries (by type, time range)
CREATE INDEX idx_audit_logs_event_type_created_at ON audit_logs(event_type, created_at DESC);

-- Index for IP-based analysis (detect repeated violations)
CREATE INDEX idx_audit_logs_ip_address_created_at ON audit_logs(ip_address, created_at DESC);

-- Comments
COMMENT ON TABLE audit_logs IS 'Security and operational audit log. Retention: 90 days.';
COMMENT ON COLUMN audit_logs.event_type IS 'Categorizes event for filtering and alerting';
COMMENT ON COLUMN audit_logs.details IS 'Flexible JSON storage for event-specific context';
```

**Retention Policy**: Automatic cleanup after 90 days via cron job or scheduled task.

---

## Migration Strategy

### Initial Migration (P1 - Data Persistence)

**File**: `backend/src/migrations/001_initial_schema.js`

```javascript
exports.up = async (db) => {
  await db.runSql(`
    CREATE TABLE polls (
      id SERIAL PRIMARY KEY,
      room_code VARCHAR(6) NOT NULL UNIQUE,
      question VARCHAR(200) NOT NULL,
      options JSONB NOT NULL CHECK (jsonb_array_length(options) BETWEEN 2 AND 5),
      state VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (state IN ('waiting', 'open', 'closed')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
      is_active BOOLEAN NOT NULL DEFAULT true
    );

    CREATE UNIQUE INDEX idx_polls_room_code_active ON polls(room_code) WHERE is_active = true;
    CREATE INDEX idx_polls_expires_at ON polls(expires_at) WHERE is_active = true;

    CREATE TABLE participants (
      id SERIAL PRIMARY KEY,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      nickname VARCHAR(50) NOT NULL,
      socket_id VARCHAR(100),
      joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      is_connected BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT uk_participants_poll_nickname UNIQUE (poll_id, nickname)
    );

    CREATE INDEX idx_participants_poll_id ON participants(poll_id) WHERE is_connected = true;
    CREATE INDEX idx_participants_socket_id ON participants(socket_id) WHERE socket_id IS NOT NULL;

    CREATE TABLE votes (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      option_index INTEGER NOT NULL CHECK (option_index BETWEEN 0 AND 4),
      voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT uk_votes_participant UNIQUE (participant_id)
    );

    CREATE INDEX idx_votes_participant_id ON votes(participant_id);
  `);
};

exports.down = async (db) => {
  await db.runSql(`
    DROP TABLE IF EXISTS votes CASCADE;
    DROP TABLE IF EXISTS participants CASCADE;
    DROP TABLE IF EXISTS polls CASCADE;
  `);
};
```

### Security Migration (P2 - Audit Logs)

**File**: `backend/src/migrations/002_audit_logs.js`

```javascript
exports.up = async (db) => {
  await db.runSql(`
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

    CREATE INDEX idx_audit_logs_event_type_created_at ON audit_logs(event_type, created_at DESC);
    CREATE INDEX idx_audit_logs_ip_address_created_at ON audit_logs(ip_address, created_at DESC);
  `);
};

exports.down = async (db) => {
  await db.runSql('DROP TABLE IF EXISTS audit_logs CASCADE;');
};
```

---

## Query Patterns

### 1. Create Poll (Host)
```sql
INSERT INTO polls (room_code, question, options)
VALUES ($1, $2, $3)
RETURNING id, room_code, created_at;
```

### 2. Join Poll (Participant)
```sql
-- Verify poll exists and is active
SELECT id, state FROM polls WHERE room_code = $1 AND is_active = true;

-- Add participant (fail if nickname taken due to UNIQUE constraint)
INSERT INTO participants (poll_id, nickname, socket_id)
VALUES ($1, $2, $3)
RETURNING id, joined_at;
```

### 3. Submit Vote
```sql
-- Upsert pattern (insert or update)
INSERT INTO votes (participant_id, option_index, voted_at, updated_at)
VALUES ($1, $2, NOW(), NOW())
ON CONFLICT (participant_id)
DO UPDATE SET option_index = EXCLUDED.option_index, updated_at = NOW()
RETURNING id, voted_at, updated_at;
```

### 4. Get Poll Results
```sql
SELECT
  p.id, p.room_code, p.question, p.options, p.state,
  COUNT(DISTINCT part.id) FILTER (WHERE part.is_connected) AS participant_count,
  jsonb_agg(
    jsonb_build_object(
      'option_index', v.option_index,
      'count', COUNT(v.id)
    )
    ORDER BY v.option_index
  ) FILTER (WHERE v.id IS NOT NULL) AS vote_counts
FROM polls p
LEFT JOIN participants part ON part.poll_id = p.id
LEFT JOIN votes v ON v.participant_id = part.id
WHERE p.room_code = $1 AND p.is_active = true
GROUP BY p.id;
```

**Expected Result**:
```json
{
  "id": 42,
  "room_code": "3B7KWX",
  "question": "What is your favorite programming language?",
  "options": ["JavaScript", "Python", "Go", "Rust"],
  "state": "open",
  "participant_count": 12,
  "vote_counts": [
    {"option_index": 0, "count": 3},
    {"option_index": 1, "count": 5},
    {"option_index": 2, "count": 2},
    {"option_index": 3, "count": 2}
  ]
}
```

### 5. Cleanup Expired Polls (Cron Job)
```sql
-- Soft delete expired polls
UPDATE polls
SET is_active = false
WHERE expires_at < NOW() AND is_active = true
RETURNING id, room_code, expires_at;
```

---

## Performance Considerations

### Indexes
- **`idx_polls_room_code_active`**: Partial unique index on active polls only. Supports fast room code lookups (<1ms).
- **`idx_participants_poll_id`**: Partial index on connected participants. Optimizes participant count queries.
- **`idx_participants_socket_id`**: Supports socket disconnect handling (find participant by socket ID).
- **`idx_votes_participant_id`**: Enables efficient vote aggregation joins.

### Connection Pooling
- **Pool Size**: 20 connections (configurable via `DB_POOL_MAX`)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds
- Prevents connection exhaustion under high WebSocket load

### Transaction Isolation
- **Vote Submission**: `READ COMMITTED` (default) sufficient. Upsert pattern is atomic.
- **Poll State Change**: Serializable isolation if implementing optimistic locking in future.

### Caching Strategy
- **Redis Cache**: Poll data cached by room_code for 5 minutes (reduces database load for repeated lookups)
- **Cache Invalidation**: On poll state change, vote submission (publish Redis event to invalidate cache)
- **Session Data**: Participant connection state stored in Redis, not PostgreSQL (ephemeral data, high update frequency)

---

## Data Retention & Cleanup

**Retention Policies** (FR-005):
- **Active Polls**: 30 days from creation (configurable via `POLL_RETENTION_DAYS`)
- **Inactive Polls**: Retained indefinitely for audit purposes (soft deleted via `is_active = false`)
- **Audit Logs**: 90 days (hard delete via scheduled cleanup job)

**Cleanup Jobs** (implement via cron or scheduled tasks):
1. **Expire Old Polls**: Run daily, soft delete polls where `expires_at < NOW()`
2. **Purge Audit Logs**: Run weekly, hard delete audit logs older than 90 days
3. **Disconnect Stale Participants**: Run hourly, mark participants disconnected if `last_seen_at < NOW() - INTERVAL '30 minutes'`

---

## Migration Execution

**Development**:
```bash
# Run migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Seed test data
npm run db:seed
```

**Production**:
```bash
# Automated migration in CI/CD pipeline (before deployment)
npm run migrate:up -- --env production

# Verify migration success
npm run migrate:status
```

**Migration Library**: Use `db-migrate` or `knex` for migration management (reversible, transaction-wrapped, version-tracked).

---

## Validation Against Requirements

- **FR-001**: ✅ All poll data persisted to durable storage (PostgreSQL)
- **FR-002**: ✅ Participant data persisted (participants, votes tables)
- **FR-003**: ✅ Complete state restored after restart (all tables loaded on startup)
- **FR-004**: ✅ Participants can reconnect (socket_id updated, is_connected flag)
- **FR-005**: ✅ Configurable retention (30 days via expires_at, cleanup jobs)
- **FR-006**: ✅ Backup/recovery via PostgreSQL PITR, automated backups
- **FR-012**: ✅ Security events logged (audit_logs table)

---

## Next Steps

1. **Implement Repository Pattern**: Create `PollRepository`, `ParticipantRepository`, `VoteRepository` classes wrapping SQL queries
2. **Write Migration Scripts**: Use `db-migrate` to create versioned, reversible migrations
3. **Add Integration Tests**: Test database operations (create poll, join, vote, disconnect scenarios)
4. **Configure Backup**: Set up automated PostgreSQL backups (AWS RDS automatic backups, pg_dump cron jobs)
5. **Implement Cleanup Jobs**: Scheduled tasks for poll expiration, audit log purging
