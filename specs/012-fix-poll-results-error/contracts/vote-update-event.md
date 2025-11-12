# Contract: vote-update Socket.io Event

**Event Name**: `vote-update`
**Direction**: Server → Client (broadcast to room)
**Protocol**: Socket.io WebSocket
**Version**: 1.0 (unchanged by this bug fix)
**Related Issue**: #33 - TypeError in PollResults.jsx

## Purpose

Broadcast real-time vote count updates to all clients in a poll room whenever a participant submits or changes their vote. This enables the host dashboard and participant views to display live voting results.

## Event Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Participant │         │    Backend   │         │  Host        │
│  (Browser)   │         │  (Node.js)   │         │  (Browser)   │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  submit-vote           │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │ [Process vote]         │
       │                        │ [Calculate counts]     │
       │                        │                        │
       │                        │  vote-update (broadcast)
       │                        │──────────────────────> │
       │  vote-update (echo)    │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │  [Update UI]           │                 [Update UI]
```

## Payload Schema

### TypeScript Definition
```typescript
interface VoteUpdatePayload {
  votes: number[];        // Array of vote counts per option
  percentages: number[];  // Array of vote percentages per option
  timestamp: string;      // ISO 8601 timestamp
}
```

### JavaScript Example
```javascript
{
  votes: [5, 3, 2],           // Option 0: 5 votes, Option 1: 3 votes, Option 2: 2 votes
  percentages: [50, 30, 20],  // 50%, 30%, 20%
  timestamp: "2025-11-11T14:23:45.123Z"
}
```

### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["votes", "percentages", "timestamp"],
  "properties": {
    "votes": {
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0
      },
      "description": "Array of vote counts per option (index-aligned with poll.options)"
    },
    "percentages": {
      "type": "array",
      "items": {
        "type": "number",
        "minimum": 0,
        "maximum": 100
      },
      "description": "Array of vote percentages per option (0-100)"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of when the update was generated"
    }
  }
}
```

## Field Specifications

### `votes` (required)
- **Type**: `number[]` (array of non-negative integers)
- **Constraints**:
  - All elements MUST be non-negative integers (>= 0)
  - Array length MUST match the number of options in the poll
  - `votes[i]` represents the total vote count for `poll.options[i]`
  - Sum of all votes MUST equal the total number of participants who have voted
- **Example**: `[5, 3, 2]` means 5 votes for option 0, 3 for option 1, 2 for option 2

### `percentages` (required)
- **Type**: `number[]` (array of numbers between 0 and 100)
- **Constraints**:
  - All elements MUST be numbers in range [0, 100]
  - Array length MUST match the number of options in the poll
  - `percentages[i]` represents the percentage of votes for `poll.options[i]`
  - Sum of all percentages MUST equal 100 (or 0 if no votes have been cast)
  - Percentages SHOULD be rounded to whole numbers for display
- **Example**: `[50, 30, 20]` means 50% of votes for option 0, 30% for option 1, 20% for option 2

### `timestamp` (required)
- **Type**: `string` (ISO 8601 date-time)
- **Constraints**:
  - MUST be a valid ISO 8601 timestamp
  - SHOULD include milliseconds for precision
  - SHOULD use UTC timezone (Z suffix)
- **Purpose**: Event ordering, debugging, and potential future features (e.g., voting timeline)
- **Example**: `"2025-11-11T14:23:45.123Z"`

## Invariants

### Array Length Invariant
```javascript
votes.length === percentages.length === poll.options.length
```
All arrays MUST have the same length, equal to the number of poll options.

### Vote Count Invariant
```javascript
votes.every(count => count >= 0 && Number.isInteger(count))
```
All vote counts MUST be non-negative integers.

### Percentage Invariant
```javascript
percentages.every(pct => pct >= 0 && pct <= 100)
percentages.reduce((sum, pct) => sum + pct, 0) === 100 || percentages.every(pct => pct === 0)
```
All percentages MUST be in range [0, 100] and sum to 100 (or all be 0 if no votes).

### Index Alignment Invariant
```javascript
votes[i] corresponds to poll.options[i]
percentages[i] corresponds to poll.options[i]
```
Array indices MUST align with poll option indices.

## Backend Implementation

**File**: `backend/src/sockets/emitters/broadcastVoteUpdate.js`

```javascript
function broadcastVoteUpdate(io, roomCode, votes, percentages) {
  const payload = {
    votes,           // Array of vote counts
    percentages,     // Array of percentages
    timestamp: new Date().toISOString(),
  };

  logger.info({ roomCode, votes, percentages }, 'Broadcasting vote-update event');
  io.to(roomCode).emit(VOTE_UPDATE, payload);
  websocketMessagesTotal.labels('outbound', VOTE_UPDATE).inc();
}
```

## Frontend Implementation

### Event Listener Setup

**File**: `frontend/src/services/socketService.js`

```javascript
export const onVoteUpdate = (callback) => {
  socket.on(VOTE_UPDATE, callback);
};
```

### Event Handler

**File**: `frontend/src/pages/HostDashboard.jsx`

**Before Fix** (caused TypeError):
```javascript
const handleVoteUpdate = data => {
  setVoteResults({
    counts: data.votes,      // ← Mismatch: storing 'votes' as 'counts'
    percentages: data.percentages,
  });
};
```

**After Fix** (correct):
```javascript
const handleVoteUpdate = data => {
  setVoteResults({
    votes: data.votes,       // ← Aligned: 'votes' maps to 'votes'
    percentages: data.percentages,
  });
};
```

### Component Usage

**File**: `frontend/src/components/PollResults.jsx`

```javascript
function PollResults({ options, counts, percentages, pollState }) {
  // Defensive code to handle edge cases
  const maxCount = Math.max(...(counts || []), 1);

  return (
    <div className="poll-results">
      {options.map((option, index) => {
        const count = counts[index] || 0;           // From voteResults.votes
        const percentage = percentages[index] || 0; // From voteResults.percentages
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div key={option} className="result-item">
            <span>{option}</span>
            <span>{count} vote{count !== 1 ? 's' : ''} ({percentage}%)</span>
            <div className="result-bar" style={{ width: `${barWidth}%` }} />
          </div>
        );
      })}
    </div>
  );
}
```

## Error Scenarios

### Scenario 1: Missing Field
**Condition**: Backend emits event without `votes` field
```javascript
{ percentages: [50, 30, 20], timestamp: "..." }  // Missing 'votes'
```

**Expected Behavior**:
- Frontend receives event with `data.votes === undefined`
- State update sets `voteResults.votes = undefined`
- Component receives `counts = undefined`
- **Before fix**: `Math.max(...counts, 1)` throws TypeError
- **After fix**: `Math.max(...(counts || []), 1)` returns 1 (safe fallback)

**Prevention**: Backend MUST always include all required fields

### Scenario 2: Wrong Data Type
**Condition**: Backend emits `votes` as non-array
```javascript
{ votes: "5,3,2", percentages: [50, 30, 20], timestamp: "..." }
```

**Expected Behavior**:
- Frontend receives `data.votes = "5,3,2"` (string)
- State update sets `voteResults.votes = "5,3,2"`
- Component tries to spread string: `Math.max(..."5,3,2", 1)`
- **Before fix**: TypeError (string is iterable but elements are chars)
- **After fix**: Still problematic (defensive code helps but doesn't fully prevent)

**Prevention**: Backend MUST validate data types before emitting

### Scenario 3: Array Length Mismatch
**Condition**: `votes.length !== poll.options.length`
```javascript
// Poll has 3 options, but votes array has 2 elements
{ votes: [5, 3], percentages: [62.5, 37.5], timestamp: "..." }
```

**Expected Behavior**:
- Component renders options.length items
- `counts[2]` is undefined for third option
- Fallback in component: `const count = counts[index] || 0` shows "0 votes"
- UI displays incorrect data but doesn't crash

**Prevention**: Backend MUST ensure array lengths match poll options

## Testing Requirements

### Contract Tests (Backend)

```javascript
describe('vote-update event contract', () => {
  it('should emit votes as array of numbers', () => {
    const payload = captureEmittedEvent();
    expect(payload.votes).toBeInstanceOf(Array);
    expect(payload.votes.every(v => typeof v === 'number')).toBe(true);
  });

  it('should emit percentages as array of numbers', () => {
    const payload = captureEmittedEvent();
    expect(payload.percentages).toBeInstanceOf(Array);
    expect(payload.percentages.every(p => typeof p === 'number')).toBe(true);
  });

  it('should emit timestamp as ISO 8601 string', () => {
    const payload = captureEmittedEvent();
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should have matching array lengths', () => {
    const payload = captureEmittedEvent();
    expect(payload.votes.length).toBe(payload.percentages.length);
  });
});
```

### Integration Tests (Frontend)

```javascript
describe('HostDashboard vote-update handling', () => {
  it('should update voteResults when vote-update is received', () => {
    const mockEvent = {
      votes: [5, 3, 2],
      percentages: [50, 30, 20],
      timestamp: '2025-11-11T14:23:45.123Z'
    };

    emitSocketEvent('vote-update', mockEvent);

    expect(screen.getByText('5 votes (50%)')).toBeInTheDocument();
    expect(screen.getByText('3 votes (30%)')).toBeInTheDocument();
    expect(screen.getByText('2 votes (20%)')).toBeInTheDocument();
  });

  it('should handle missing votes field gracefully', () => {
    const mockEvent = {
      percentages: [50, 30, 20],
      timestamp: '2025-11-11T14:23:45.123Z'
      // Missing 'votes' field
    };

    emitSocketEvent('vote-update', mockEvent);

    // Should not crash, should show fallback values
    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument();
  });
});
```

## Backward Compatibility

### Version 1.0 (Current)
- Event name: `vote-update`
- Payload fields: `votes`, `percentages`, `timestamp`
- All fields required

### Future Considerations
If breaking changes are needed in the future:
- Consider versioning the event (e.g., `vote-update-v2`)
- Maintain backward compatibility by supporting both versions during transition
- Document migration path in release notes

## Related Contracts

- **submit-vote**: Client → Server event that triggers vote-update
- **poll-state-changed**: Server → Client event for poll state transitions
- **participant-joined**: Server → Client event when participant joins room
- **participant-left**: Server → Client event when participant leaves room

## Change Log

### 2025-11-11 - Bug Fix (#33)
- **Issue**: Frontend expected `counts` field but backend sends `votes`
- **Fix**: Updated frontend state management to use `votes` field
- **Contract Change**: None (contract was already correct)
- **Breaking Change**: No (internal frontend state change only)

## Notes

- This contract documents the **existing, correct** backend behavior
- The bug was in the **frontend state management**, not the contract
- The fix aligns frontend with this contract (no contract changes needed)
- Component prop interface still uses `counts` for semantic clarity at UI layer
