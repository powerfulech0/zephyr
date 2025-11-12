# Research: Vote Submission Bug Root Cause Analysis

**Feature**: 011-fix-vote-submission
**Date**: 2025-11-11
**Status**: Root cause identified

## Executive Summary

**Root Cause**: Parameter mismatch between frontend and backend for vote submission.

- **Frontend** sends: `{ roomCode, nickname, optionIndex }`
- **Backend** expects: `{ roomCode, participantId, optionIndex }`

The backend's `handleSubmitVote` function validates for `participantId` but the frontend's `submitVote` function sends `nickname`. This causes the backend to return an error: "Missing required fields: roomCode, participantId, and optionIndex".

**Impact**: Critical - Participants cannot cast votes at all.

**Fix Location**: Frontend (`frontend/src/services/socketService.js:76`)

**Fix Type**: Change parameter from `nickname` to `participantId` in frontend socket emission.

## Investigation Details

### Code Analysis

**Backend Handler** (`backend/src/sockets/events/submitVote.js:17-24`):

```javascript
const { roomCode, participantId, optionIndex } = data;

// Validate required fields
if (roomCode === undefined || participantId === undefined || optionIndex === undefined) {
  const error = 'Missing required fields: roomCode, participantId, and optionIndex';
  logger.warn({ socketId: socket.id, data }, error);
  if (callback) callback({ success: false, error });
  return;
}
```

**Frontend Service** (`frontend/src/services/socketService.js:74-83`):

```javascript
export const submitVote = (roomCode, nickname, optionIndex) =>
  new Promise((resolve, reject) => {
    socket.emit('submit-vote', { roomCode, nickname, optionIndex }, response => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
```

**Call Site** (`frontend/src/pages/VotePage.jsx:98`):

```javascript
await submitVote(roomCode, nickname, optionIndex);
```

### Parameter Name History

The inconsistency suggests either:
1. Backend was refactored to use `participantId` but frontend wasn't updated
2. Frontend was never aligned with backend expectations
3. Different developers worked on frontend vs backend without contract alignment

### Verification of Fix

**Question**: Should we use `participantId` or `nickname`?

**Analysis of backend**:
- The backend's `pollService.submitVote()` likely uses `participantId` to track votes
- Database schema probably uses `participantId` as foreign key
- `nickname` is a display name, not a unique identifier

**Decision**: Frontend should send `participantId` instead of `nickname`.

### Related Code to Check

**1. How does frontend obtain `participantId`?**

Need to check the `joinRoom` response to see if `participantId` is returned and stored.

**Backend joinRoom** (`backend/src/sockets/events/joinRoom.js`):
- Need to verify if this returns `participantId` in response
- Check if `participantId` is stored in sessionStorage

**Frontend JoinPage**:
- Need to verify if `participantId` is extracted from join response
- Check if it's stored in sessionStorage alongside nickname and roomCode

**2. What is stored in sessionStorage?**

Current code in VotePage.jsx:
```javascript
const storedNickname = sessionStorage.getItem('nickname');
const storedRoomCode = sessionStorage.getItem('roomCode');
```

Need to check if `participantId` is also stored.

### Testing Strategy

**1. Unit Tests** (`frontend/tests/unit/socketService.test.js`):
- Update test to send `participantId` instead of `nickname`
- Verify parameter structure matches backend expectations

**2. Contract Tests** (`frontend/tests/contract/VotePage.test.js`):
- Verify vote submission with correct `participantId` parameter
- Test error handling for missing `participantId`

**3. Integration Tests**:
- End-to-end flow: join → open voting → submit vote
- Verify vote is persisted and broadcast correctly

## Technical Decisions

### Decision 1: Parameter Name Standardization

**Question**: Use `participantId` or `nickname` across the stack?

**Options**:
| Option | Pros | Cons |
|--------|------|------|
| A: Use `participantId` everywhere | Unique identifier, matches database schema, prevents name collisions | Requires frontend changes |
| B: Change backend to accept `nickname` | No frontend changes needed | Nickname isn't unique, could cause vote tracking issues |
| C: Accept both parameters | Backward compatible | Adds complexity, doesn't solve root issue |

**Chosen**: **Option A** - Use `participantId` everywhere

**Rationale**:
- `participantId` is the unique identifier for participants
- Database foreign keys likely use `participantId`, not `nickname`
- Two participants could have same nickname (edge case)
- Backend already validates for `participantId`, so it's the established contract
- Frontend change is minimal and localized

### Decision 2: SessionStorage Updates

**Question**: Where should `participantId` come from?

**Investigation Required**:
1. Check if backend `joinRoom` returns `participantId`
2. Verify if frontend stores `participantId` in sessionStorage
3. If not stored, update JoinPage to store it

**Expected Flow**:
```
1. Participant joins via JoinPage
2. Backend creates participant with unique participantId
3. Backend returns { success: true, poll, participantId }
4. Frontend stores participantId in sessionStorage
5. VotePage retrieves participantId from sessionStorage
6. VotePage passes participantId to submitVote()
```

### Decision 3: Backward Compatibility

**Question**: Do we need to maintain backward compatibility?

**Analysis**:
- This is a bug, not a feature change
- Current code is non-functional (votes don't work)
- No backward compatibility needed since the feature is broken

**Decision**: No backward compatibility required. Fix the bug directly.

## Implementation Plan

### Changes Required

**1. Frontend: socketService.js** (PRIMARY FIX)

Change submitVote function signature and emission:

```javascript
// Before
export const submitVote = (roomCode, nickname, optionIndex) =>
  new Promise((resolve, reject) => {
    socket.emit('submit-vote', { roomCode, nickname, optionIndex }, response => {
      // ...
    });
  });

// After
export const submitVote = (roomCode, participantId, optionIndex) =>
  new Promise((resolve, reject) => {
    socket.emit('submit-vote', { roomCode, participantId, optionIndex }, response => {
      // ...
    });
  });
```

**2. Frontend: VotePage.jsx**

Update to use `participantId` instead of `nickname`:

```javascript
// Before
await submitVote(roomCode, nickname, optionIndex);

// After
await submitVote(roomCode, participantId, optionIndex);
```

Also need to:
- Load `participantId` from sessionStorage
- Add validation that `participantId` exists
- Update error message if `participantId` missing

**3. Investigate JoinPage** (DEPENDENCY CHECK)

Verify that `participantId` is:
- Returned from backend joinRoom response
- Stored in sessionStorage

If not, need additional changes:
- Update JoinPage to extract and store `participantId`
- Verify backend joinRoom returns `participantId`

**4. Update Tests**

- `frontend/tests/unit/socketService.test.js`: Update to use `participantId`
- `frontend/tests/contract/VotePage.test.js`: Update to use `participantId`
- Add test for missing `participantId` error case

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `participantId` not returned by backend | Medium | High | Investigate joinRoom backend handler |
| `participantId` not stored in sessionStorage | High | High | Update JoinPage to store `participantId` |
| Tests fail after parameter change | High | Medium | Update all affected tests |
| Existing participants have active sessions | Low | Low | Clear sessionStorage on next join |

## Next Steps

1. ✅ **Phase 0 Complete**: Root cause identified
2. **Phase 1**: Verify `participantId` availability
   - Check backend joinRoom response
   - Check frontend JoinPage sessionStorage handling
3. **Phase 1**: Create data model for VotePage state
4. **Phase 1**: Create contract tests for vote submission
5. **Phase 1**: Create quickstart for bug reproduction
6. **Phase 2**: Generate tasks.md for implementation

## Open Questions

1. ~~What is the root cause?~~ **RESOLVED**: Parameter mismatch (`nickname` vs `participantId`)
2. **Does backend joinRoom return `participantId`?** → Need to investigate
3. **Does frontend store `participantId` in sessionStorage?** → Need to investigate
4. **Are there other places using `nickname` that should use `participantId`?** → Need code search

## References

- Issue: https://github.com/powerfulech0/zephyr/issues/31
- Backend handler: `backend/src/sockets/events/submitVote.js:17`
- Frontend service: `frontend/src/services/socketService.js:76`
- Frontend component: `frontend/src/pages/VotePage.jsx:98`
