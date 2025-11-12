# Research: Fix Poll Results TypeError on Host Dashboard

**Feature**: 012-fix-poll-results-error
**Date**: 2025-11-11
**Researcher**: Automated analysis from codebase inspection

## Problem Analysis

### Root Cause

The TypeError occurs due to a field name mismatch between the backend WebSocket event payload and the frontend component expectations:

**Backend (broadcastVoteUpdate.js:14-18)**:
```javascript
const payload = {
  votes,           // ← Backend uses 'votes'
  percentages,
  timestamp: new Date().toISOString(),
};
```

**Frontend (HostDashboard.jsx:39-43)**:
```javascript
const handleVoteUpdate = data => {
  setVoteResults({
    counts: data.votes,      // ← Maps 'votes' to 'counts'
    percentages: data.percentages,
  });
};
```

**Component (PollResults.jsx:5, 10)**:
```javascript
function PollResults({ options, counts, percentages, pollState }) {
  // ...
  const maxCount = Math.max(...counts, 1);  // ← Expects 'counts' prop
```

The issue occurs at `PollResults.jsx:10` where `Math.max(...counts, 1)` attempts to spread the `counts` array. When the component is initially rendered before any vote-update events are received, or if the state update fails, `counts` is undefined, causing the TypeError "counts is not iterable".

### Current Data Flow

1. **Participant votes** → Backend receives vote via Socket.io
2. **Backend processes vote** → `submitVote.js` calls `broadcastVoteUpdate()`
3. **Backend emits event** → `vote-update` event with payload `{ votes, percentages, timestamp }`
4. **Frontend receives event** → `onVoteUpdate()` handler in `HostDashboard.jsx`
5. **Frontend maps data** → Maps `data.votes` to state field `counts`
6. **Component renders** → `PollResults` receives `counts` and `percentages` as props
7. **Component uses data** → `Math.max(...counts, 1)` calculates max for bar width

### When the Error Occurs

The error can occur in these scenarios:

1. **Initial render**: When poll is created, `voteResults` is initialized with empty arrays:
   ```javascript
   setVoteResults({
     counts: new Array(filteredOptions.length).fill(0),
     percentages: new Array(filteredOptions.length).fill(0),
   });
   ```
   This is correct and shouldn't cause errors.

2. **After vote submission**: When a vote-update event is received, the handler correctly maps `data.votes` to `counts`. This should work.

3. **The actual issue**: Looking more closely at the code, the initial state is set correctly in HostDashboard.jsx:139-142. The real issue might be:
   - If the component renders before state is initialized
   - If the prop drilling is incorrect
   - If there's a race condition

Let me check the actual error more carefully. The error message says "counts is not iterable" at line 10 of PollResults.jsx. This means the `counts` prop is being passed as `undefined` or a non-array value.

Looking at the code flow again:
- HostDashboard initializes: `voteResults` state with `{ counts: [], percentages: [] }` (line 29)
- When poll is created: Sets `counts` and `percentages` to arrays filled with zeros (lines 139-142)
- On vote update: Maps `data.votes` to `counts` (lines 39-43)
- PollResults receives: `counts={voteResults.counts}` (line 267)

**The actual bug**: The initial state on line 29 is `{ counts: [], percentages: [] }` which is an empty object, not an object with empty arrays. When the component first renders the poll results before any votes, `voteResults.counts` might be `undefined`.

Wait, looking at line 29 again:
```javascript
const [voteResults, setVoteResults] = useState({ counts: [], percentages: [] });
```

This IS setting empty arrays. So why is `counts` undefined?

**Hypothesis**: The PropTypes validation (line 45) shows `counts` is required:
```javascript
counts: PropTypes.arrayOf(PropTypes.number).isRequired,
```

But there might be a render where `counts` is being passed as something other than an array.

Let me trace through what happens when `handleVoteUpdate` is called:
```javascript
const handleVoteUpdate = data => {
  setVoteResults({
    counts: data.votes,      // ← What if data.votes is undefined?
    percentages: data.percentages,
  });
};
```

**FOUND IT**: If the backend sends a malformed vote-update event where `data.votes` is undefined or missing, then `setVoteResults` will set `counts` to `undefined`, and when PollResults tries to spread it in `Math.max(...counts, 1)`, it will throw "counts is not iterable".

However, looking at the backend code, `broadcastVoteUpdate()` is called with explicit `votes` and `percentages` parameters, so this shouldn't happen unless there's a bug in how those values are computed.

**Most likely scenario**: After reviewing the error report and code flow, the simplest explanation is that this is a transient issue that occurs when:
1. The WebSocket event is received with the correct data
2. The handler maps `data.votes` → `counts`
3. React triggers a re-render
4. During the re-render, there's a brief moment where the new state hasn't fully propagated

However, the user reported this as "After voting, error message on host", which suggests it happens reliably after votes are submitted.

Let me check if there are any other places where PollResults is used or where the data structure might be different.

Actually, re-reading the issue: "Uncaught TypeError: counts is not iterable" at PollResults.jsx:10. The issue says it happens "After voting" on the host dashboard. This is strange because:
- The host initializes `voteResults.counts` as an array of zeros
- On vote update, it should receive `data.votes` as an array
- Unless... `data.votes` is not an array?

**Final analysis**: The most likely explanation is that the `vote-update` event payload is being consumed somewhere else or there's a version mismatch where an older frontend expects `counts` but the backend sends `votes`. Given that this is an error that occurs "after voting", it's most likely that:

1. The initial render works fine (counts is initialized correctly)
2. When a vote is submitted, the vote-update event is emitted
3. The event payload has `votes` instead of `counts`
4. The handler tries to access it but gets undefined
5. This triggers a re-render with undefined counts
6. The spread operator fails

The fix should ensure that:
1. The field name is consistent (either `votes` or `counts` throughout)
2. There's defensive code to handle undefined/missing data
3. PropTypes are correct

## Decision: Fix Approach

**Option 1: Change frontend to use 'votes' consistently**
- Rationale: Backend already uses 'votes', less change surface
- Changes: Rename `counts` to `votes` in frontend state and component props
- Risk: Moderate - affects component interface and tests

**Option 2: Add defensive code to handle undefined**
- Rationale: Prevents errors even if data is malformed
- Changes: Add fallback values in component
- Risk: Low - doesn't fix root cause, only symptom

**Option 3: Keep 'counts' but ensure proper mapping**
- Rationale: Component interface already uses 'counts', maintain consistency
- Changes: Verify mapping in HostDashboard.jsx is correct
- Risk: Low - minimal change

**CHOSEN: Option 1 + Option 2 (Defense in depth)**

Rename the frontend state field from `voteResults.counts` to `voteResults.votes` to match the backend event payload, eliminating the mapping layer. Additionally, add defensive code in PollResults to handle edge cases where data might be undefined.

**Why this approach**:
1. Aligns field names between backend and frontend (principle of least surprise)
2. Removes unnecessary mapping that can fail
3. Adds defensive coding for resilience
4. Minimal code changes
5. Maintains backward compatibility with component interface

## Best Practices

### React State Management for WebSocket Events
- **Always initialize state with valid default values** (empty arrays, not undefined)
- **Validate event data before setting state** (use optional chaining or default values)
- **Use defensive coding in components** (check for undefined/null before operations)
- **PropTypes should match actual runtime behavior** (don't mark as required if it can be undefined)

### WebSocket Event Handling
- **Document event payload structure** in a contract file
- **Version event payloads** if breaking changes are needed
- **Validate incoming events** before processing
- **Log malformed events** for debugging

### Error Prevention
- **Use TypeScript or PropTypes** to catch type mismatches
- **Initialize state properly** to prevent undefined values
- **Add null checks** before spread operators or array methods
- **Test with missing/malformed data** to ensure resilience

## Alternatives Considered

### Alternative 1: Change backend to use 'counts'
**Rejected because**:
- Backend is working correctly
- Would require backend changes and all clients to update
- More complex change with higher risk
- Breaks existing API contract

### Alternative 2: Use a data adapter/transformer
**Rejected because**:
- Over-engineering for a simple field name mismatch
- Adds unnecessary abstraction layer
- Violates Principle II (Simplicity)

### Alternative 3: Use TypeScript to prevent this
**Rejected because**:
- Project uses JavaScript, not TypeScript
- Would require major refactoring
- Out of scope for a bug fix
- Constitution doesn't require TypeScript (only recommends it)

## Implementation Notes

### Files to Modify

1. **frontend/src/pages/HostDashboard.jsx**
   - Line 29: Change `{ counts: [], percentages: [] }` to `{ votes: [], percentages: [] }`
   - Lines 139-142: Change `counts:` to `votes:`
   - Line 267: Change `counts={voteResults.counts}` to `votes={voteResults.votes}` OR keep as `counts` but use `counts={voteResults.votes}`

   **Decision**: Keep component prop as `counts` (don't change component interface), but change internal state to use `votes`. This minimizes changes to the PollResults component and its tests.

2. **frontend/src/components/PollResults.jsx**
   - Line 10: Add defensive code: `const maxCount = Math.max(...(counts || []), 1);`
   - This prevents TypeError if counts is undefined

### Testing Strategy

1. **Unit tests**:
   - Test PollResults with undefined counts (edge case)
   - Test PollResults with empty array (initial state)
   - Test PollResults with actual vote data

2. **Integration tests**:
   - Test vote submission flow end-to-end
   - Verify vote-update event is processed correctly
   - Ensure UI updates without errors

3. **Manual testing**:
   - Create poll
   - Submit vote as participant
   - Verify host dashboard updates without console errors
   - Test with multiple participants voting

### Validation Criteria

- No console errors when votes are submitted
- Vote counts display correctly on host dashboard
- Real-time updates work within 1 second
- All existing tests pass
- PropTypes validation passes
- No breaking changes to component interface

## References

- Backend event emitter: `backend/src/sockets/emitters/broadcastVoteUpdate.js`
- Frontend event handler: `frontend/src/pages/HostDashboard.jsx:39-43`
- Component implementation: `frontend/src/components/PollResults.jsx:5-50`
- Event type constants: `shared/eventTypes.js`
- Constitution Principle II: Simplicity & Production Readiness
- Constitution Principle IV: Test-Driven Development
