# Data Model: Voting App MVP

**Date**: 2025-11-07
**Feature**: 001-voting-app-mvp
**Purpose**: Define in-memory data structures for poll management, participant tracking, and vote storage

## Overview

This MVP uses in-memory storage (JavaScript Map/Object) with no database persistence. All data is lost on server restart per FR-019. Data structures optimized for:
- Fast lookups by room code (O(1) Map access)
- Efficient vote counting and percentage calculation
- Real-time broadcast support (track connected socket IDs)

## Core Entities

### Poll

Represents a voting session with lifecycle management (waiting → open → closed).

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `roomCode` | String | Unique 6-character identifier (uppercase alphanumeric) | Matches `/^[2-9A-HJ-NP-Z]{6}$/` (no ambiguous chars) |
| `question` | String | Poll question text | 1-500 characters, required |
| `options` | Array<String> | Answer choices (2-5 options) | 2-5 elements, each 1-100 chars |
| `state` | Enum | Poll status: `'waiting'`, `'open'`, `'closed'` | Must be one of three values |
| `votes` | Map<String, Number> | Participant nickname → option index mapping | Keys unique per poll, values 0 to options.length-1 |
| `participants` | Set<String> | Connected participant nicknames | Max 20 elements per FR-016 |
| `hostSocketId` | String | Socket ID of poll creator | Required for host-only operations |
| `createdAt` | Date | Poll creation timestamp | ISO 8601 format |

**State Transitions**:
```
waiting → open   (host clicks "Open Voting")
open → closed    (host clicks "Close Voting")
closed → [end]   (no further transitions)
```

**Example**:
```javascript
{
  roomCode: 'AB3K9T',
  question: 'What is your favorite programming language?',
  options: ['JavaScript', 'Python', 'Go', 'Rust'],
  state: 'open',
  votes: new Map([
    ['Alice', 0],    // Alice voted for JavaScript
    ['Bob', 2],      // Bob voted for Go
    ['Charlie', 0]   // Charlie voted for JavaScript
  ]),
  participants: new Set(['Alice', 'Bob', 'Charlie']),
  hostSocketId: 'xyz123socketid',
  createdAt: new Date('2025-11-07T10:30:00Z')
}
```

**Business Rules**:
- Room codes must be unique across all active polls
- Votes only accepted when state === 'open' (FR-008)
- Host cannot vote (participants Set excludes host)
- Poll cleared from memory when all participants disconnect (FR-020)

---

### Participant

Represents a user in a poll room (ephemeral, tracked via Socket.io connection).

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `nickname` | String | User-chosen display name | 1-20 characters, unique per room (FR-004) |
| `socketId` | String | Socket.io connection identifier | Required for targeted emit/disconnect handling |
| `roomCode` | String | Associated poll room code | Must reference existing poll |
| `role` | Enum | User type: `'host'` or `'participant'` | Host creates poll, participants vote |
| `voteIndex` | Number \| null | Selected option index (null if not voted) | 0 to options.length-1, or null |
| `connectedAt` | Date | Join timestamp | ISO 8601 format |

**Note**: Participant data is NOT stored as separate entities in MVP. Instead:
- `nickname` tracked in Poll.participants Set
- `socketId` → `roomCode` mapping stored in global SocketRoomMap
- Vote tracked in Poll.votes Map

**Example (conceptual representation)**:
```javascript
{
  nickname: 'Alice',
  socketId: 'abc456',
  roomCode: 'AB3K9T',
  role: 'participant',
  voteIndex: 0,  // Voted for option 0
  connectedAt: new Date('2025-11-07T10:32:15Z')
}
```

**Business Rules**:
- Nickname must be unique within a room (FR-004)
- Participant removed from Poll.participants Set on disconnect
- Participant can change vote (updates Poll.votes Map) while state === 'open'
- Max 20 participants per room (FR-016)

---

### Vote

Represents a participant's selection (embedded in Poll.votes Map, not a standalone entity).

**Structure**: `Map<nickname, optionIndex>`

**Fields** (implicit in Map key-value):

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `nickname` | String (Map key) | Who voted | Must exist in Poll.participants |
| `optionIndex` | Number (Map value) | Which option chosen | 0 to Poll.options.length - 1 |

**Vote Counting Algorithm**:
```javascript
function calculateVoteCounts(poll) {
  const counts = new Array(poll.options.length).fill(0);

  for (const [nickname, optionIndex] of poll.votes.entries()) {
    if (poll.participants.has(nickname)) {  // Only count connected participants
      counts[optionIndex]++;
    }
  }

  return counts;
}

function calculatePercentages(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);

  return counts.map(count => Math.round((count / total) * 100));
}
```

**Example Vote Counts**:
```javascript
// Given Poll.votes = { 'Alice': 0, 'Bob': 2, 'Charlie': 0 }
// And Poll.options = ['JS', 'Python', 'Go', 'Rust']

calculateVoteCounts(poll)
// => [2, 0, 1, 0]  (2 votes for JS, 0 for Python, 1 for Go, 0 for Rust)

calculatePercentages([2, 0, 1, 0])
// => [67, 0, 33, 0]  (67% JS, 0% Python, 33% Go, 0% Rust)
```

**Business Rules**:
- One vote per participant (Map key uniqueness enforces FR-006)
- Participant can change vote (overwrites Map value) while poll.state === 'open' (FR-007)
- Disconnected participants' votes still counted until poll cleared (FR-020)

---

## Storage Implementation

### PollManager Class

Central in-memory store for all polls.

**Implementation** (backend/src/models/PollManager.js):
```javascript
const { generateRoomCode } = require('../services/roomCodeGenerator');

class PollManager {
  constructor() {
    this.polls = new Map();  // roomCode → Poll object
    this.socketRoomMap = new Map();  // socketId → roomCode
  }

  /**
   * Create new poll and return room code
   */
  createPoll(question, options, hostSocketId) {
    const roomCode = this._generateUniqueRoomCode();
    const poll = {
      roomCode,
      question,
      options,
      state: 'waiting',
      votes: new Map(),
      participants: new Set(),
      hostSocketId,
      createdAt: new Date()
    };

    this.polls.set(roomCode, poll);
    this.socketRoomMap.set(hostSocketId, roomCode);

    return poll;
  }

  /**
   * Get poll by room code
   */
  getPoll(roomCode) {
    return this.polls.get(roomCode);
  }

  /**
   * Add participant to poll
   * @returns {success, error}
   */
  addParticipant(roomCode, nickname, socketId) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.participants.has(nickname)) {
      return { success: false, error: 'Nickname already taken' };
    }
    if (poll.participants.size >= 20) {
      return { success: false, error: 'Room is full (20 participants max)' };
    }

    poll.participants.add(nickname);
    this.socketRoomMap.set(socketId, roomCode);

    return { success: true, poll };
  }

  /**
   * Record or update vote
   * @returns {success, error, votes}
   */
  recordVote(roomCode, nickname, optionIndex) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.state !== 'open') {
      return { success: false, error: 'Voting is not open' };
    }
    if (!poll.participants.has(nickname)) {
      return { success: false, error: 'Participant not in room' };
    }
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return { success: false, error: 'Invalid option index' };
    }

    poll.votes.set(nickname, optionIndex);

    const counts = this._calculateVoteCounts(poll);
    const percentages = this._calculatePercentages(counts);

    return {
      success: true,
      votes: counts,
      percentages
    };
  }

  /**
   * Change poll state (host only)
   */
  changePollState(roomCode, newState, hostSocketId) {
    const poll = this.polls.get(roomCode);
    if (!poll) {
      return { success: false, error: 'Poll not found' };
    }
    if (poll.hostSocketId !== hostSocketId) {
      return { success: false, error: 'Only host can change poll state' };
    }
    if (!['waiting', 'open', 'closed'].includes(newState)) {
      return { success: false, error: 'Invalid state' };
    }

    poll.state = newState;
    return { success: true, state: newState };
  }

  /**
   * Remove participant on disconnect
   */
  removeParticipant(socketId) {
    const roomCode = this.socketRoomMap.get(socketId);
    if (!roomCode) return null;

    const poll = this.polls.get(roomCode);
    if (!poll) return null;

    // Find and remove nickname
    for (const nickname of poll.participants) {
      if (this.socketRoomMap.get(socketId) === roomCode) {
        poll.participants.delete(nickname);
        break;
      }
    }

    this.socketRoomMap.delete(socketId);

    // Clear poll if all participants gone (FR-020)
    if (poll.participants.size === 0 && poll.hostSocketId === socketId) {
      this.polls.delete(roomCode);
      return { roomCode, cleared: true };
    }

    return { roomCode, cleared: false };
  }

  /**
   * Generate unique room code (retry on collision)
   */
  _generateUniqueRoomCode() {
    let roomCode;
    do {
      roomCode = generateRoomCode();
    } while (this.polls.has(roomCode));
    return roomCode;
  }

  _calculateVoteCounts(poll) {
    const counts = new Array(poll.options.length).fill(0);
    for (const [nickname, optionIndex] of poll.votes.entries()) {
      if (poll.participants.has(nickname)) {
        counts[optionIndex]++;
      }
    }
    return counts;
  }

  _calculatePercentages(counts) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total === 0) return counts.map(() => 0);
    return counts.map(count => Math.round((count / total) * 100));
  }
}

module.exports = PollManager;
```

---

## Data Flow Examples

### Example 1: Poll Creation
```
1. Host → POST /api/polls { question, options }
2. PollManager.createPoll() → roomCode 'AB3K9T'
3. Response: { roomCode: 'AB3K9T', state: 'waiting' }
```

### Example 2: Participant Join
```
1. Participant → Socket.io emit 'join-room' { roomCode: 'AB3K9T', nickname: 'Alice' }
2. PollManager.addParticipant('AB3K9T', 'Alice', socketId)
3. Poll.participants.add('Alice')
4. Socket acknowledgment → { success: true, poll }
5. Broadcast to room → 'participant-joined' { nickname: 'Alice', count: 1 }
```

### Example 3: Vote Submission
```
1. Alice → Socket.io emit 'submit-vote' { roomCode: 'AB3K9T', nickname: 'Alice', optionIndex: 0 }
2. PollManager.recordVote() → validates state === 'open'
3. Poll.votes.set('Alice', 0)
4. Calculate counts: [1, 0, 0, 0]
5. Socket acknowledgment → { success: true }
6. Broadcast to room → 'vote-update' { votes: [1, 0, 0, 0], percentages: [100, 0, 0, 0] }
```

### Example 4: Poll State Change
```
1. Host → Socket.io emit 'change-poll-state' { roomCode: 'AB3K9T', newState: 'open' }
2. PollManager.changePollState() → validates hostSocketId
3. Poll.state = 'open'
4. Broadcast to room → 'poll-state-changed' { state: 'open' }
```

---

## Memory Management

### Cleanup Triggers (FR-020)

1. **All participants disconnect**: Poll deleted from memory
2. **Host disconnects**: Poll marked as abandoned but kept for active participants until they disconnect
3. **Session timeout (future)**: Could add TTL for abandoned polls (not in MVP)

### Memory Estimates

- Poll object: ~1KB (question + options + metadata)
- Vote entry: ~50 bytes (nickname string + integer)
- 20 participants × 50 bytes = 1KB votes per poll
- **Total per poll**: ~2KB

For 100 concurrent polls: ~200KB memory usage (negligible)

---

## Validation Rules Summary

| Entity | Field | Validation |
|--------|-------|------------|
| Poll | roomCode | 6 chars, `/^[2-9A-HJ-NP-Z]{6}$/` |
| Poll | question | 1-500 chars |
| Poll | options | Array of 2-5 strings, each 1-100 chars |
| Poll | state | Enum: waiting, open, closed |
| Poll | participants | Max 20, unique nicknames |
| Participant | nickname | 1-20 chars, alphanumeric + spaces, unique per room |
| Vote | optionIndex | Integer, 0 to options.length-1 |

All validations enforced in PollManager methods before modifying data structures.
