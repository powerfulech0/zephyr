# Data Model: Vote Submission Fix

**Feature**: 011-fix-vote-submission
**Date**: 2025-11-11

## Overview

This document defines the data structures and state models involved in fixing the vote submission bug. The fix requires changes to both backend response format and frontend state management to properly track `participantId`.

## Backend Data Model

### Participant Entity (Existing)

```typescript
{
  id: string | number,        // Unique participant identifier (participantId)
  nickname: string,           // Display name chosen by participant
  roomCode: string,           // Poll room code (6 characters)
  socketId: string,          // Current WebSocket socket.id
  joinedAt: timestamp,       // When participant joined
  vote: number | null,       // Current vote (option index) or null
  disconnected: boolean      // Connection status
}
```

**Key Fields**:
- `id` (or `participantId`): Primary identifier, used for vote tracking
- `nickname`: Display name, NOT unique (multiple participants could have same nickname)
- `vote`: Stores the participant's current vote selection

### JoinRoom Response (TO BE UPDATED)

**Current Response**:
```javascript
{
  success: true,
  reconnected: false,
  poll: {
    roomCode: string,
    question: string,
    options: string[],
    state: 'waiting' | 'open' | 'closed',
    participantCount: number
  }
}
```

**Updated Response** (with participantId):
```javascript
{
  success: true,
  reconnected: false,
  participantId: string | number,  // NEW: Include participantId
  poll: {
    roomCode: string,
    question: string,
    options: string[],
    state: 'waiting' | 'open' | 'closed',
    participantCount: number
  }
}
```

### SubmitVote Request (Existing - CORRECT)

```javascript
{
  roomCode: string,           // Poll room code
  participantId: string | number,  // Unique participant identifier
  optionIndex: number         // Selected option (0-based index)
}
```

### SubmitVote Response (Existing - CORRECT)

```javascript
{
  success: boolean,
  error?: string,             // Present if success = false
  voteStatistics?: {
    voteCounts: number[],
    percentages: number[]
  }
}
```

## Frontend Data Model

### SessionStorage (TO BE UPDATED)

**Current Storage**:
```javascript
sessionStorage.setItem('roomCode', string)     // Poll room code
sessionStorage.setItem('nickname', string)     // Participant nickname
sessionStorage.setItem('poll', JSON<Poll>)     // Poll data object
```

**Updated Storage** (with participantId):
```javascript
sessionStorage.setItem('roomCode', string)        // Poll room code
sessionStorage.setItem('nickname', string)        // Participant nickname
sessionStorage.setItem('participantId', string)   // NEW: Participant ID
sessionStorage.setItem('poll', JSON<Poll>)        // Poll data object
```

### VotePage Component State

```typescript
{
  // Session data (from sessionStorage)
  poll: Poll | null,                     // Poll details
  nickname: string,                      // Participant display name
  roomCode: string,                      // 6-character room code
  participantId: string | number | null, // NEW: Unique participant ID

  // Vote state
  selectedOption: number | null,         // Index of selected option
  hasVoted: boolean,                     // Has submitted at least one vote
  voteResults: {
    votes: number[],                     // Vote counts per option
    percentages: number[]                // Percentages per option
  },

  // Poll state
  pollState: 'waiting' | 'open' | 'closed',  // Current poll state

  // UI state
  error: string | null,                  // Error message to display
  loading: boolean,                      // Vote submission in progress
  showConfirmation: boolean,             // Show "Vote recorded!" message

  // Connection state
  isReconnecting: boolean,               // Reconnection in progress
  connectionStatus: 'connected' | 'disconnected' | 'failed'
}
```

## State Transitions

### Join Flow (TO BE UPDATED)

```
1. User submits join form (roomCode, nickname)
   ↓
2. Frontend calls joinRoom(roomCode, nickname)
   ↓
3. Backend validates and creates/updates participant
   ↓
4. Backend returns { success, participantId, poll }  ← UPDATED
   ↓
5. Frontend stores in sessionStorage:
   - roomCode
   - nickname
   - participantId  ← NEW
   - poll
   ↓
6. Navigate to /vote/:roomCode
```

### Vote Submission Flow (TO BE UPDATED)

```
1. User clicks option button
   ↓
2. VotePage.handleVoteSubmit(optionIndex)
   ↓
3. Validate: loading === false && pollState === 'open'
   ↓
4. Set loading = true, error = null
   ↓
5. Call submitVote(roomCode, participantId, optionIndex)  ← UPDATED (was nickname)
   ↓
6. Socket.io emits 'submit-vote' with { roomCode, participantId, optionIndex }
   ↓
7a. Success path:
    - Backend persists vote
    - Returns { success: true, voteStatistics }
    - Frontend sets: selectedOption, hasVoted, showConfirmation
    - Backend broadcasts 'vote-update' to all participants
    ↓
7b. Error path:
    - Backend returns { success: false, error: message }
    - Frontend sets: error message
    ↓
8. Set loading = false
```

### Session Validation (TO BE UPDATED)

**Current Validation**:
```javascript
const storedPoll = sessionStorage.getItem('poll');
const storedNickname = sessionStorage.getItem('nickname');
const storedRoomCode = sessionStorage.getItem('roomCode');

if (!storedPoll || !storedNickname || !storedRoomCode) {
  setError('Session expired. Please join again.');
  navigate('/join');
}
```

**Updated Validation** (with participantId check):
```javascript
const storedPoll = sessionStorage.getItem('poll');
const storedNickname = sessionStorage.getItem('nickname');
const storedRoomCode = sessionStorage.getItem('roomCode');
const storedParticipantId = sessionStorage.getItem('participantId');  // NEW

if (!storedPoll || !storedNickname || !storedRoomCode || !storedParticipantId) {
  setError('Session expired. Please join again.');
  navigate('/join');
}
```

## Error States

### Missing ParticipantId

**Scenario**: User navigates directly to `/vote/:roomCode` without joining

**Detection**: `participantId` is null or undefined

**Handling**:
```javascript
if (!participantId) {
  setError('Session expired. Please join again.');
  setTimeout(() => navigate('/join'), 2000);
  return;
}
```

### Invalid ParticipantId

**Scenario**: Backend doesn't recognize `participantId` (participant was removed/expired)

**Backend Response**: `{ success: false, error: "Participant not found" }`

**Handling**:
- Display error message
- Allow retry (clicking option again)
- If persistent, suggest rejoining poll

### Reconnection with ParticipantId

**Scenario**: Participant reconnects after disconnection

**Flow**:
1. Socket reconnects
2. `onConnectionStatus` callback fires with status: 'connected'
3. Socket.io auto-rejoin logic sends `join-room` with stored nickname
4. Backend recognizes existing participant and returns `reconnected: true`
5. Backend sets `socket.data.participantId` to existing participant's ID
6. Participant can continue voting with same `participantId`

**Note**: The `participantId` in sessionStorage remains valid across reconnections.

## Validation Rules

### ParticipantId Format

- Type: `string` or `number`
- Required: Yes (for vote submission)
- Uniqueness: Yes (per poll/roomCode)
- Persistence: Stored in sessionStorage, valid for session duration

### Vote Submission Validation

**Frontend Checks**:
1. `participantId` exists and is not null
2. `roomCode` exists and is valid format (6 characters)
3. `optionIndex` is number and within bounds (0 to options.length-1)
4. `pollState === 'open'`
5. `loading === false` (no duplicate submissions)
6. `connectionStatus === 'connected'`

**Backend Checks** (existing):
1. `participantId` exists in database for given `roomCode`
2. Poll exists and is in 'open' state
3. `optionIndex` is valid (within poll.options bounds)

## Migration Considerations

### Backward Compatibility

**Question**: What happens to existing sessions when fix is deployed?

**Answer**: No backward compatibility needed
- Current implementation is broken (votes don't work)
- Users will need to rejoin polls after deployment
- SessionStorage will be cleared on page refresh
- No persistent user data to migrate

### Deployment Strategy

1. Deploy backend changes first (return `participantId` in joinRoom)
2. Deploy frontend changes (store and use `participantId`)
3. Existing sessions will have missing `participantId` → users redirected to join page
4. New joins will work correctly

## Related Files

**Backend**:
- `backend/src/sockets/events/joinRoom.js:64-74, 92-103` - Update callback to include `participantId`
- `backend/src/sockets/events/submitVote.js:17` - Already expects `participantId` (no changes)

**Frontend**:
- `frontend/src/pages/JoinPage.jsx:55-60` - Store `participantId` in sessionStorage
- `frontend/src/pages/VotePage.jsx:30-46` - Load `participantId` from sessionStorage
- `frontend/src/pages/VotePage.jsx:98` - Pass `participantId` to submitVote
- `frontend/src/services/socketService.js:74-83` - Update signature and emit

**Tests**:
- `frontend/tests/contract/VotePage.test.js` - Update to use `participantId`
- `frontend/tests/unit/socketService.test.js` - Update to use `participantId`
- `backend/tests/contract/submitVote.test.js` - Already uses `participantId` (no changes)
