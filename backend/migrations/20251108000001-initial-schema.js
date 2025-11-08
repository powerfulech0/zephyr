/**
 * Initial database schema migration
 * Creates polls, participants, votes tables for production-ready persistence
 */

'use strict';

let dbm;
let type;
let seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  // Create polls table
  return db
    .createTable('polls', {
      id: { type: 'int', primaryKey: true, autoIncrement: true },
      room_code: { type: 'string', length: 6, notNull: true, unique: true },
      question: { type: 'string', length: 200, notNull: true },
      options: { type: 'jsonb', notNull: true },
      state: {
        type: 'string',
        length: 20,
        notNull: true,
        defaultValue: 'waiting',
      },
      created_at: {
        type: 'timestamp with time zone',
        notNull: true,
        defaultValue: new String('NOW()'),
      },
      expires_at: {
        type: 'timestamp with time zone',
        notNull: true,
        defaultValue: new String("NOW() + INTERVAL '30 days'"),
      },
      is_active: { type: 'boolean', notNull: true, defaultValue: true },
    })
    .then(() => {
      // Add check constraints for polls
      return db.runSql(
        `ALTER TABLE polls
         ADD CONSTRAINT chk_polls_state CHECK (state IN ('waiting', 'open', 'closed')),
         ADD CONSTRAINT chk_polls_options_length CHECK (jsonb_array_length(options) BETWEEN 2 AND 5)`
      );
    })
    .then(() => {
      // Create indexes for polls
      return db.runSql(`
        CREATE UNIQUE INDEX idx_polls_room_code_active
        ON polls(room_code) WHERE is_active = true;

        CREATE INDEX idx_polls_expires_at
        ON polls(expires_at) WHERE is_active = true;
      `);
    })
    .then(() => {
      // Add comments for polls table
      return db.runSql(`
        COMMENT ON TABLE polls IS 'Stores poll questions, options, and lifecycle state';
        COMMENT ON COLUMN polls.room_code IS 'Unique 6-character room code for participant access';
        COMMENT ON COLUMN polls.options IS 'Array of 2-5 answer options stored as JSON';
        COMMENT ON COLUMN polls.state IS 'Poll lifecycle: waiting (created), open (voting allowed), closed (voting ended)';
        COMMENT ON COLUMN polls.expires_at IS 'Automatic expiration date (default 30 days from creation)';
        COMMENT ON COLUMN polls.is_active IS 'Soft delete flag. Inactive polls excluded from queries but retained for auditing';
      `);
    })
    .then(() => {
      // Create participants table
      return db.createTable('participants', {
        id: { type: 'int', primaryKey: true, autoIncrement: true },
        poll_id: {
          type: 'int',
          notNull: true,
          foreignKey: {
            name: 'participants_poll_id_fk',
            table: 'polls',
            rules: {
              onDelete: 'CASCADE',
            },
            mapping: 'id',
          },
        },
        nickname: { type: 'string', length: 50, notNull: true },
        socket_id: { type: 'string', length: 100 },
        joined_at: {
          type: 'timestamp with time zone',
          notNull: true,
          defaultValue: new String('NOW()'),
        },
        last_seen_at: {
          type: 'timestamp with time zone',
          notNull: true,
          defaultValue: new String('NOW()'),
        },
        is_connected: { type: 'boolean', notNull: true, defaultValue: true },
      });
    })
    .then(() => {
      // Add unique constraint for participants
      return db.runSql(`
        ALTER TABLE participants
        ADD CONSTRAINT uk_participants_poll_nickname UNIQUE (poll_id, nickname);
      `);
    })
    .then(() => {
      // Create indexes for participants
      return db.runSql(`
        CREATE INDEX idx_participants_poll_id
        ON participants(poll_id) WHERE is_connected = true;

        CREATE INDEX idx_participants_socket_id
        ON participants(socket_id) WHERE socket_id IS NOT NULL;
      `);
    })
    .then(() => {
      // Add comments for participants table
      return db.runSql(`
        COMMENT ON TABLE participants IS 'Tracks participants who have joined polls';
        COMMENT ON COLUMN participants.nickname IS 'Display name chosen by participant. Unique within each poll.';
        COMMENT ON COLUMN participants.socket_id IS 'Current Socket.io connection ID. NULL when disconnected.';
        COMMENT ON COLUMN participants.last_seen_at IS 'Last activity timestamp. Used for session timeout detection.';
        COMMENT ON COLUMN participants.is_connected IS 'Connection status. False when participant disconnects.';
      `);
    })
    .then(() => {
      // Create votes table
      return db.createTable('votes', {
        id: { type: 'int', primaryKey: true, autoIncrement: true },
        participant_id: {
          type: 'int',
          notNull: true,
          foreignKey: {
            name: 'votes_participant_id_fk',
            table: 'participants',
            rules: {
              onDelete: 'CASCADE',
            },
            mapping: 'id',
          },
        },
        option_index: { type: 'int', notNull: true },
        voted_at: {
          type: 'timestamp with time zone',
          notNull: true,
          defaultValue: new String('NOW()'),
        },
        updated_at: {
          type: 'timestamp with time zone',
          notNull: true,
          defaultValue: new String('NOW()'),
        },
      });
    })
    .then(() => {
      // Add constraints for votes
      return db.runSql(`
        ALTER TABLE votes
        ADD CONSTRAINT uk_votes_participant UNIQUE (participant_id),
        ADD CONSTRAINT chk_votes_option_index CHECK (option_index BETWEEN 0 AND 4);
      `);
    })
    .then(() => {
      // Create index for votes
      return db.runSql(`
        CREATE INDEX idx_votes_participant_id ON votes(participant_id);
      `);
    })
    .then(() => {
      // Add comments for votes table
      return db.runSql(`
        COMMENT ON TABLE votes IS 'Stores participant votes. One row per participant, updated when vote changes.';
        COMMENT ON COLUMN votes.option_index IS 'Zero-based index into polls.options array (0-4 for 2-5 options)';
        COMMENT ON COLUMN votes.voted_at IS 'Timestamp of initial vote submission';
        COMMENT ON COLUMN votes.updated_at IS 'Timestamp of last vote change (same as voted_at if never changed)';
      `);
    });
};

exports.down = function (db) {
  // Drop tables in reverse order (respecting foreign key constraints)
  return db
    .dropTable('votes')
    .then(() => db.dropTable('participants'))
    .then(() => db.dropTable('polls'));
};

exports._meta = {
  version: 1,
};
