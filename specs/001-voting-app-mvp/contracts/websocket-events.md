# WebSocket Events Contract

**Protocol**: Socket.io v4.x
**Transport**: WebSocket with HTTP long-polling fallback
**Date**: 2025-11-07

## Connection

**Endpoint**: `ws://localhost:4000` (development) or `wss://api.zephyr.example.com` (production)

**Configuration**:
```javascript
{
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling']
}
```

---

## Client → Server Events

### 1. `join-room`

Participant joins a poll room with nickname.

**Emitted by**: Participant (voter or host rejoining)

**Payload**:
```typescript
{
  roomCode: string;      // 6-char room code (e.g., "AB3K9T")
  nickname: string;      // 1-20 chars, alphanumeric + spaces
}
```

**Acknowledgment Response**:
```typescript
// Success
{
  success: true;
  poll: {
    roomCode: string;
    question: string;
    options: string[];
    state: 'waiting' | 'open' | 'closed';
    participantCount: number;
  }
}

// Error
{
  success: false;
  error: string;  // "Poll not found" | "Nickname already taken" | "Room is full"
}
```

**Example**:
```javascript
socket.emit('join-room',
  { roomCode: 'AB3K9T', nickname: 'Alice' },
  (response) => {
    if (response.success) {
      console.log('Joined poll:', response.poll);
    } else {
      console.error('Join failed:', response.error);
    }
  }
);
```

**Requirements**: FR-003, FR-004, FR-016

---

### 2. `submit-vote`

Participant submits or changes their vote.

**Emitted by**: Participant

**Payload**:
```typescript
{
  roomCode: string;      // 6-char room code
  nickname: string;      // Participant's nickname
  optionIndex: number;   // 0 to options.length-1
}
```

**Acknowledgment Response**:
```typescript
// Success
{
  success: true;
}

// Error
{
  success: false;
  error: string;  // "Poll not found" | "Voting is not open" | "Invalid option index"
}
```

**Example**:
```javascript
socket.emit('submit-vote',
  { roomCode: 'AB3K9T', nickname: 'Alice', optionIndex: 0 },
  (response) => {
    if (response.success) {
      console.log('Vote registered');
    } else {
      console.error('Vote failed:', response.error);
    }
  }
);
```

**Requirements**: FR-006, FR-007, FR-008, FR-012

---

### 3. `change-poll-state`

Host changes poll state (open/close voting).

**Emitted by**: Host only

**Payload**:
```typescript
{
  roomCode: string;      // 6-char room code
  newState: 'waiting' | 'open' | 'closed';
}
```

**Acknowledgment Response**:
```typescript
// Success
{
  success: true;
  state: 'waiting' | 'open' | 'closed';
}

// Error
{
  success: false;
  error: string;  // "Poll not found" | "Only host can change poll state" | "Invalid state"
}
```

**Example**:
```javascript
socket.emit('change-poll-state',
  { roomCode: 'AB3K9T', newState: 'open' },
  (response) => {
    if (response.success) {
      console.log('Poll now', response.state);
    } else {
      console.error('State change failed:', response.error);
    }
  }
);
```

**Requirements**: FR-005, FR-014

---

## Server → Client Events (Broadcasts)

### 4. `participant-joined`

Broadcast when a participant joins the room.

**Broadcast to**: All clients in the room (including the joiner)

**Payload**:
```typescript
{
  nickname: string;      // Who joined
  count: number;         // New total participant count (1-20)
}
```

**Example**:
```javascript
socket.on('participant-joined', (data) => {
  console.log(`${data.nickname} joined (${data.count} total)`);
  updateParticipantCount(data.count);
});
```

**Requirements**: FR-011, FR-015

---

### 5. `participant-left`

Broadcast when a participant disconnects.

**Broadcast to**: All remaining clients in the room

**Payload**:
```typescript
{
  nickname: string;      // Who left
  count: number;         // New total participant count (0-19)
}
```

**Example**:
```javascript
socket.on('participant-left', (data) => {
  console.log(`${data.nickname} left (${data.count} remaining)`);
  updateParticipantCount(data.count);
});
```

**Requirements**: FR-011, FR-015, FR-018

---

### 6. `vote-update`

Broadcast when any participant votes or changes their vote.

**Broadcast to**: All clients in the room

**Payload**:
```typescript
{
  votes: number[];        // Vote counts per option [2, 0, 1, 0]
  percentages: number[];  // Percentages per option [67, 0, 33, 0]
}
```

**Example**:
```javascript
socket.on('vote-update', (data) => {
  console.log('Vote counts:', data.votes);
  console.log('Percentages:', data.percentages);
  updateVoteChart(data.votes, data.percentages);
});
```

**Requirements**: FR-009, FR-010, SC-004

---

### 7. `poll-state-changed`

Broadcast when host changes poll state (open/close).

**Broadcast to**: All clients in the room (including host)

**Payload**:
```typescript
{
  state: 'waiting' | 'open' | 'closed';
  changedBy: 'host';
}
```

**Example**:
```javascript
socket.on('poll-state-changed', (data) => {
  console.log('Poll state now:', data.state);
  if (data.state === 'open') {
    enableVoting();
  } else if (data.state === 'closed') {
    disableVoting();
    showFinalResults();
  }
});
```

**Requirements**: FR-014, SC-006

---

## Built-in Socket.io Events

### `connect`

Fired when client successfully connects to server.

**Usage**:
```javascript
socket.on('connect', () => {
  console.log('Connected with socket ID:', socket.id);
});
```

---

### `disconnect`

Fired when client loses connection to server.

**Usage**:
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server forcibly disconnected, do not reconnect
  } else {
    // Connection lost, will auto-reconnect
    showReconnectingUI();
  }
});
```

---

### `reconnect`

Fired when client successfully reconnects after disconnect.

**Usage**:
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  const savedRoomCode = sessionStorage.getItem('roomCode');
  const savedNickname = sessionStorage.getItem('nickname');
  if (savedRoomCode && savedNickname) {
    socket.emit('join-room', { roomCode: savedRoomCode, nickname: savedNickname });
  }
  hideReconnectingUI();
});
```

**Requirements**: FR-018, SC-007

---

## Event Flow Examples

### Example 1: Participant Join Flow

```
1. Client connects → 'connect' event
2. Client emits 'join-room' { roomCode, nickname } → waits for ack
3. Server validates → sends ack { success: true, poll }
4. Server broadcasts 'participant-joined' { nickname, count } → all clients update UI
```

### Example 2: Vote Submission Flow

```
1. Client emits 'submit-vote' { roomCode, nickname, optionIndex } → waits for ack
2. Server validates (poll.state === 'open') → records vote → sends ack { success: true }
3. Server calculates new vote counts/percentages
4. Server broadcasts 'vote-update' { votes, percentages } → all clients update charts
```

### Example 3: Poll State Change Flow

```
1. Host emits 'change-poll-state' { roomCode, newState: 'open' } → waits for ack
2. Server validates (hostSocketId matches) → updates state → sends ack { success: true }
3. Server broadcasts 'poll-state-changed' { state: 'open' } → all clients enable voting
```

### Example 4: Reconnection Flow

```
1. Client loses connection → 'disconnect' event → shows "Reconnecting..." UI
2. Socket.io auto-reconnects → 'reconnect' event
3. Client retrieves saved roomCode + nickname from sessionStorage
4. Client emits 'join-room' again → rejoins poll
5. Server sends current poll state in ack → client syncs UI
```

---

## Error Handling

All client→server events with acknowledgments follow this pattern:

**Success**: `{ success: true, ...data }`
**Error**: `{ success: false, error: string }`

### Common Error Messages

| Error | Cause | User Action |
|-------|-------|-------------|
| "Poll not found" | Invalid room code or poll deleted | Re-enter room code |
| "Nickname already taken" | Duplicate nickname in room | Choose different nickname |
| "Room is full" | 20 participants already connected | Wait for slot to open |
| "Voting is not open" | Poll state is waiting or closed | Wait for host to open voting |
| "Only host can change poll state" | Non-host tried to change state | Only host has control buttons |
| "Invalid option index" | optionIndex out of range | Client validation error (bug) |

---

## Security Considerations

1. **No authentication**: MVP relies on nickname uniqueness per room (FR-004). No password/token required.
2. **Host verification**: Host identified by socket ID stored at poll creation. No bearer token.
3. **Rate limiting**: Not implemented in MVP (consider for production).
4. **Input validation**: All payloads validated server-side (room code format, nickname length, option index range).
5. **CORS**: Server configured to accept connections from frontend origin only.

---

## Performance Requirements

| Metric | Target | How Measured |
|--------|--------|--------------|
| Vote broadcast latency | <2 seconds | Time from `submit-vote` emit to `vote-update` received by all clients |
| State change latency | <1 second | Time from `change-poll-state` emit to `poll-state-changed` received (SC-006) |
| Reconnection time | <5 seconds | Time from disconnect to successful `join-room` ack after reconnect |
| Max concurrent connections per poll | 20 | Hard limit enforced by FR-016 |

---

## Testing Contract Compliance

Contract tests (backend/tests/contract/websocket.test.js) must verify:

1. **Event names**: All events match this specification exactly (no typos)
2. **Payload schemas**: All fields present with correct types
3. **Acknowledgments**: All client→server events return ack with success/error
4. **Broadcasts**: All expected broadcasts fire when state changes
5. **Error cases**: All error conditions return expected error messages

Example test:
```javascript
test('submit-vote returns error when poll not open', (done) => {
  socket.emit('submit-vote',
    { roomCode: 'CLOSED', nickname: 'Alice', optionIndex: 0 },
    (response) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Voting is not open');
      done();
    }
  );
});
```
