// Socket.io event name constants
// Shared between backend and frontend

// Client → Server events
const JOIN_ROOM = 'join-room';
const SUBMIT_VOTE = 'submit-vote';
const CHANGE_POLL_STATE = 'change-poll-state';

// Server → Client events (broadcasts)
const PARTICIPANT_JOINED = 'participant-joined';
const PARTICIPANT_REJOINED = 'participant-rejoined';
const PARTICIPANT_LEFT = 'participant-left';
const VOTE_UPDATE = 'vote-update';
const POLL_STATE_CHANGED = 'poll-state-changed';

module.exports = {
  // Client → Server
  JOIN_ROOM,
  SUBMIT_VOTE,
  CHANGE_POLL_STATE,
  // Server → Client
  PARTICIPANT_JOINED,
  PARTICIPANT_REJOINED,
  PARTICIPANT_LEFT,
  VOTE_UPDATE,
  POLL_STATE_CHANGED,
};
