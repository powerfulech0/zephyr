-- Create polls table
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

-- Create participants table
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

-- Create votes table
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