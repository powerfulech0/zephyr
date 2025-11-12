# Vote Submission Contract

**Feature**: 011-fix-vote-submission
**Date**: 2025-11-11
**Contract Type**: WebSocket Event

## Overview

This contract defines the expected behavior of the `submit-vote` WebSocket event for the vote submission bug fix. It covers the corrected parameter structure using `participantId` instead of `nickname`.

## Socket Event: `submit-vote`

### Direction
Client → Server (with acknowledgment callback)

### Request Payload

```javascript
{
  roomCode: string,           // Required: 6-character poll room code
  participantId: string | number,  // Required: Unique participant identifier
  optionIndex: number         // Required: Selected option index (0-based)
}
```

### Response (Acknowledgment Callback)

**Success Response**:
```javascript
{
  success: true,
  voteStatistics: {
    voteCounts: number[],     // Vote counts for each option
    percentages: number[]     // Percentage for each option
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  error: string               // Human-readable error message
}
```

### Broadcast Event (on success)

After successful vote submission, server broadcasts to all participants in the room:

**Event**: `vote-update`

**Payload**:
```javascript
{
  votes: number[],            // Updated vote counts per option
  percentages: number[]       // Updated percentages per option
}
```

## Contract Test Scenarios

### Scenario 1: Valid Vote Submission

**Given**: Poll is open, participant has joined, connection is stable

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  participantId: '12345',
  optionIndex: 0
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: true,
  voteStatistics: {
    voteCounts: [1, 0, 0],
    percentages: [100, 0, 0]
  }
})
```

**Expected Broadcast** (to all participants in room):
```javascript
Event: 'vote-update'
Payload: {
  votes: [1, 0, 0],
  percentages: [100, 0, 0]
}
```

**Assertions**:
- `success === true`
- `voteStatistics.voteCounts.length === poll.options.length`
- `voteStatistics.percentages.length === poll.options.length`
- `vote-update` event broadcast to all room participants
- Vote persisted in database

---

### Scenario 2: Change Existing Vote

**Given**: Participant has already voted for option 0

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  participantId: '12345',
  optionIndex: 1
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: true,
  voteStatistics: {
    voteCounts: [0, 1, 0],
    percentages: [0, 100, 0]
  }
})
```

**Assertions**:
- Previous vote for option 0 is removed
- New vote for option 1 is recorded
- Only one vote exists for this participant
- `vote-update` broadcast reflects the change

---

### Scenario 3: Missing `participantId`

**Given**: Request missing required `participantId` field

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  // participantId missing
  optionIndex: 0
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: false,
  error: 'Missing required fields: roomCode, participantId, and optionIndex'
})
```

**Assertions**:
- `success === false`
- Error message is descriptive
- No vote persisted
- No `vote-update` broadcast

---

### Scenario 4: Invalid `roomCode`

**Given**: Room code doesn't exist

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'INVALID',
  participantId: '12345',
  optionIndex: 0
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: false,
  error: 'Poll not found'
})
```

**Assertions**:
- `success === false`
- Error indicates poll/room not found
- No vote persisted
- No broadcast

---

### Scenario 5: Poll Not Open

**Given**: Poll state is 'waiting' or 'closed'

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  participantId: '12345',
  optionIndex: 0
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: false,
  error: 'Poll is not open for voting'  // Or similar message
})
```

**Assertions**:
- `success === false`
- Error indicates voting is not available
- No vote persisted
- No broadcast

---

### Scenario 6: Invalid `optionIndex`

**Given**: Option index is out of bounds (negative or >= options.length)

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  participantId: '12345',
  optionIndex: 999  // Invalid index
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: false,
  error: 'Invalid option index'  // Or similar message
})
```

**Assertions**:
- `success === false`
- Error indicates invalid option
- No vote persisted
- No broadcast

---

### Scenario 7: Participant Not Found

**Given**: `participantId` doesn't exist for this room

**Request**:
```javascript
socket.emit('submit-vote', {
  roomCode: 'ABC234',
  participantId: 'NONEXISTENT',
  optionIndex: 0
}, callback)
```

**Expected Response**:
```javascript
callback({
  success: false,
  error: 'Participant not found' // Or similar message
})
```

**Assertions**:
- `success === false`
- Error indicates participant not found
- No vote persisted
- No broadcast

---

## Related Contract: `join-room` (Updated)

The `join-room` contract must also be updated to return `participantId`.

### Updated Success Response

**Before**:
```javascript
{
  success: true,
  reconnected: false,
  poll: { /* poll data */ }
}
```

**After**:
```javascript
{
  success: true,
  reconnected: false,
  participantId: string | number,  // NEW FIELD
  poll: { /* poll data */ }
}
```

**Contract Test**:
```javascript
const response = await joinRoom('ABC234', 'TestUser');

assert(response.participantId !== undefined, 'participantId must be present');
assert(typeof response.participantId === 'string' || typeof response.participantId === 'number',
  'participantId must be string or number');
```

## Frontend Service Contract

### Updated `submitVote` Function Signature

**Before**:
```javascript
submitVote(roomCode: string, nickname: string, optionIndex: number): Promise<void>
```

**After**:
```javascript
submitVote(roomCode: string, participantId: string | number, optionIndex: number): Promise<void>
```

### Usage Example

```javascript
import { submitVote } from './services/socketService';

// Inside VotePage component
const participantId = sessionStorage.getItem('participantId');
const roomCode = sessionStorage.getItem('roomCode');

try {
  await submitVote(roomCode, participantId, optionIndex);
  // Success handling
} catch (error) {
  // Error handling
  console.error('Vote submission failed:', error.message);
}
```

## Test Implementation Notes

### Unit Tests (`socketService.test.js`)

Test the service function directly:

```javascript
describe('submitVote', () => {
  it('should emit submit-vote with participantId', (done) => {
    const roomCode = 'ABC234';
    const participantId = '12345';
    const optionIndex = 0;

    mockSocket.emit = jest.fn((event, data, callback) => {
      expect(event).toBe('submit-vote');
      expect(data).toEqual({ roomCode, participantId, optionIndex });
      callback({ success: true });
      done();
    });

    submitVote(roomCode, participantId, optionIndex);
  });
});
```

### Contract Tests (`VotePage.test.js`)

Test the component integration:

```javascript
it('should submit vote with participantId from sessionStorage', async () => {
  sessionStorage.setItem('participantId', '12345');
  sessionStorage.setItem('roomCode', 'ABC234');

  render(<VotePage />);

  const optionButton = screen.getByText('Option 1');
  fireEvent.click(optionButton);

  await waitFor(() => {
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'submit-vote',
      expect.objectContaining({
        participantId: '12345',
        roomCode: 'ABC234'
      }),
      expect.any(Function)
    );
  });
});
```

### Backend Contract Tests (`submitVote.test.js`)

Test backend handler expectations:

```javascript
it('should reject vote with missing participantId', (done) => {
  const data = { roomCode: 'ABC234', optionIndex: 0 };  // Missing participantId

  socket.emit('submit-vote', data, (response) => {
    expect(response.success).toBe(false);
    expect(response.error).toContain('participantId');
    done();
  });
});

it('should accept vote with valid participantId', (done) => {
  const data = { roomCode: 'ABC234', participantId: '12345', optionIndex: 0 };

  socket.emit('submit-vote', data, (response) => {
    expect(response.success).toBe(true);
    expect(response.voteStatistics).toBeDefined();
    done();
  });
});
```

## Breaking Changes

**Impact**: This is a bug fix, not a feature change, but it requires coordinated deployment.

**Migration**:
1. Backend deployment: Returns `participantId` in `join-room` response (backward compatible)
2. Frontend deployment: Uses `participantId` in `submit-vote` request
3. Existing sessions: Will fail gracefully and prompt users to rejoin

**Rollback Plan**:
If issues arise after deployment, rollback requires:
1. Revert frontend to use `nickname`
2. Revert backend to accept `nickname` (requires code change, not just deployment rollback)
