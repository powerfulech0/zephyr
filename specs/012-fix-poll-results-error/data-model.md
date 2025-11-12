# Data Model: Fix Poll Results TypeError

**Feature**: 012-fix-poll-results-error
**Date**: 2025-11-11
**Purpose**: Document data structures involved in vote-update event flow

## Overview

This bug fix involves aligning data structures between the backend WebSocket event payload and the frontend React component state. No database changes are required.

## Entities

### Vote Update Event Payload

**Source**: Backend (`backend/src/sockets/emitters/broadcastVoteUpdate.js`)
**Lifecycle**: Created when a vote is submitted, broadcast to all clients in room, consumed by frontend
**Purpose**: Communicate real-time vote count updates to all poll participants

**Structure**:
```javascript
{
  votes: number[],        // Array of vote counts per option (index matches poll.options)
  percentages: number[],  // Array of vote percentages per option (0-100)
  timestamp: string       // ISO 8601 timestamp of when update was generated
}
```

**Field Descriptions**:
- `votes`: Array where `votes[i]` is the total number of votes for `poll.options[i]`
- `percentages`: Array where `percentages[i]` is the percentage (0-100) of votes for `poll.options[i]`
- `timestamp`: ISO 8601 timestamp for event ordering and debugging

**Validation Rules**:
- `votes` MUST be an array of non-negative integers
- `percentages` MUST be an array of numbers between 0 and 100
- `votes.length` MUST equal `percentages.length`
- `votes.length` MUST equal `poll.options.length`
- `percentages` MUST sum to 100 (or 0 if no votes)
- `timestamp` MUST be a valid ISO 8601 string

**Example**:
```javascript
{
  votes: [5, 3, 2],           // Option 0: 5 votes, Option 1: 3 votes, Option 2: 2 votes
  percentages: [50, 30, 20],  // Option 0: 50%, Option 1: 30%, Option 2: 20%
  timestamp: "2025-11-11T14:23:45.123Z"
}
```

---

### Vote Results State (Frontend)

**Source**: Frontend (`frontend/src/pages/HostDashboard.jsx`)
**Lifecycle**: Initialized when poll is created, updated on each vote-update event
**Purpose**: Store vote counts and percentages for display in PollResults component

**Current Structure** (before fix):
```javascript
{
  counts: number[],       // ← Mismatch: expects 'counts' but receives 'votes'
  percentages: number[]
}
```

**Fixed Structure** (after fix):
```javascript
{
  votes: number[],        // ← Aligned with backend event payload
  percentages: number[]
}
```

**Initialization**:
```javascript
// When poll is created (HostDashboard.jsx:139-142)
setVoteResults({
  votes: new Array(filteredOptions.length).fill(0),
  percentages: new Array(filteredOptions.length).fill(0),
});
```

**Update on Event**:
```javascript
// When vote-update event is received (HostDashboard.jsx:39-43)
const handleVoteUpdate = data => {
  setVoteResults({
    votes: data.votes,           // Direct mapping, no transformation
    percentages: data.percentages,
  });
};
```

---

### PollResults Component Props

**Source**: Frontend (`frontend/src/components/PollResults.jsx`)
**Purpose**: Display vote results with counts, percentages, and visual bars

**Props Structure**:
```javascript
{
  options: string[],      // Array of poll option text
  counts: number[],       // Array of vote counts (receives voteResults.votes)
  percentages: number[],  // Array of vote percentages
  pollState: string       // Poll state: 'waiting' | 'open' | 'closed'
}
```

**Prop Passing** (HostDashboard.jsx:265-270):
```javascript
<PollResults
  options={poll.options}
  counts={voteResults.votes}      // ← Maps 'votes' state to 'counts' prop
  percentages={voteResults.percentages}
  pollState={pollState}
/>
```

**Validation** (PropTypes):
```javascript
PollResults.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  counts: PropTypes.arrayOf(PropTypes.number).isRequired,
  percentages: PropTypes.arrayOf(PropTypes.number).isRequired,
  pollState: PropTypes.string.isRequired,
};
```

**Usage in Component**:
```javascript
// Line 10: Calculate max count for bar width scaling
const maxCount = Math.max(...(counts || []), 1);  // ← Defensive code added

// Lines 16-34: Render vote counts and bars
options.map((option, index) => {
  const count = counts[index] || 0;
  const percentage = percentages[index] || 0;
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
  // ... render UI
});
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Vote Submission Flow                       │
└─────────────────────────────────────────────────────────────────────┘

1. Participant submits vote
   ↓
2. Backend: submitVote.js processes vote
   ↓
3. Backend: broadcastVoteUpdate.js emits event
   │
   │  Payload: { votes: [5,3,2], percentages: [50,30,20], timestamp }
   │
   ↓
4. Frontend: socketService.js receives 'vote-update' event
   ↓
5. Frontend: HostDashboard.jsx handleVoteUpdate(data)
   │
   │  Before fix: setVoteResults({ counts: data.votes, ... })  ← Mapping
   │  After fix:  setVoteResults({ votes: data.votes, ... })   ← Direct
   │
   ↓
6. Frontend: HostDashboard renders PollResults
   │
   │  Before fix: <PollResults counts={voteResults.counts} />  ← undefined
   │  After fix:  <PollResults counts={voteResults.votes} />   ← array
   │
   ↓
7. Frontend: PollResults.jsx renders vote bars
   │
   │  Before fix: Math.max(...counts, 1)  ← TypeError: counts undefined
   │  After fix:  Math.max(...(counts || []), 1)  ← Safe with fallback
   │
   ↓
8. User sees updated vote counts without errors
```

## Relationships

### Event → State
- `vote-update.votes` → `voteResults.votes` (direct mapping, no transformation)
- `vote-update.percentages` → `voteResults.percentages` (direct mapping)
- `vote-update.timestamp` → (not stored, used for logging only)

### State → Props
- `voteResults.votes` → `PollResults.counts` (semantic mapping: votes=counts)
- `voteResults.percentages` → `PollResults.percentages` (direct mapping)
- `pollState` → `PollResults.pollState` (from separate state variable)

### Props → Rendering
- `counts[i]` → Vote count text: "5 votes (50%)"
- `counts[i]` → Bar width: `(count / maxCount) * 100`
- `percentages[i]` → Percentage text: "50%"

## Changes Summary

### What Changes
1. **HostDashboard.jsx state field**: `voteResults.counts` → `voteResults.votes`
2. **HostDashboard.jsx prop passing**: `counts={voteResults.counts}` → `counts={voteResults.votes}`
3. **PollResults.jsx defensive code**: `Math.max(...counts, 1)` → `Math.max(...(counts || []), 1)`

### What Stays the Same
1. **Backend event payload**: No changes (already uses `votes`)
2. **PollResults component interface**: Props still named `counts` (semantic clarity)
3. **Event type constant**: `VOTE_UPDATE` unchanged
4. **Socket.io event name**: `'vote-update'` unchanged

### Why This Works
- Backend emits `{ votes: [...], percentages: [...] }`
- Frontend stores `{ votes: [...], percentages: [...] }` (aligned with backend)
- Component receives `counts={voteResults.votes}` (semantic mapping at boundary)
- Component uses `counts` prop (semantically clear for UI rendering)
- Defensive code prevents errors if `counts` is undefined

## Validation

### State Invariants
- `voteResults.votes.length === poll.options.length` at all times
- `voteResults.percentages.length === poll.options.length` at all times
- `voteResults.votes[i] >= 0` for all i (non-negative counts)
- `voteResults.percentages[i] >= 0 && <= 100` for all i

### Component Invariants
- `counts.length === options.length` (enforced by parent state)
- `percentages.length === options.length` (enforced by parent state)
- `counts[i]` corresponds to `options[i]` (index alignment)
- `maxCount >= 1` (ensures division by zero doesn't occur)

### Event Contract
- Backend MUST emit `votes` field (array of numbers)
- Backend MUST emit `percentages` field (array of numbers)
- Frontend MUST handle missing/undefined fields gracefully
- Frontend MUST validate array lengths before rendering

## Migration Notes

### Backward Compatibility
- **No breaking changes**: Component prop interface unchanged (`counts`)
- **State field rename**: Internal only, not exposed to other components
- **Event payload**: No changes needed (backend already correct)

### Testing Impact
- Tests that access `voteResults.counts` MUST be updated to `voteResults.votes`
- Tests that check component props still use `counts` (no change)
- Tests that mock vote-update events remain unchanged (payload already correct)

### Rollout Strategy
- Frontend-only change, no backend coordination needed
- Can deploy independently
- No database migration required
- No API version change required
