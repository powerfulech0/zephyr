# Quickstart: Vote Submission Bug Reproduction

**Feature**: 011-fix-vote-submission
**Date**: 2025-11-11
**Issue**: GitHub #31 - "Frontend: Can't send vote"

## Bug Description

Participants cannot submit votes because of a parameter mismatch between frontend and backend:
- Frontend sends `nickname` in vote submission
- Backend expects `participantId`

This causes all vote attempts to fail with error: "Missing required fields: roomCode, participantId, and optionIndex"

## Prerequisites

- Node.js 18+ installed
- Repository cloned
- Dependencies installed in both `backend/` and `frontend/`

## Reproduction Steps

### 1. Start Backend Server

```bash
cd backend
npm install  # If not already done
npm start
```

Expected output:
```
Server running on http://localhost:4000
Socket.io server listening
```

### 2. Start Frontend Dev Server

```bash
cd frontend
npm install  # If not already done
npm run start
```

Expected output:
```
VITE v7.2.2  ready in 234 ms
➜  Local:   http://localhost:5173/
```

### 3. Create a Poll (Host Flow)

1. Open browser to `http://localhost:5173/`
2. Click "Create Poll" or navigate to `/host`
3. Enter poll question: "What should we have for lunch?"
4. Add options:
   - Pizza
   - Burgers
   - Salad
5. Click "Create Poll"
6. Note the **Room Code** displayed (e.g., `ABC234`)

### 4. Join as Participant

1. Open a **new browser tab** (or incognito window)
2. Navigate to `http://localhost:5173/join`
3. Enter Room Code: `ABC234` (from step 3)
4. Enter Nickname: `TestUser`
5. Click "Join Poll"
6. You should be redirected to `/vote/ABC234`

### 5. Open Voting (Host Action)

1. Go back to the **host tab**
2. Click "Open Voting" button
3. Poll state should change to "Open"

### 6. Attempt to Vote (Participant - BUG OCCURS HERE)

1. Go to the **participant tab** (`/vote/ABC234`)
2. You should see the poll question and options
3. Status should show "Poll is open" (or options should be enabled)
4. **Click on any option** (e.g., "Pizza")

**Expected Behavior**:
- Vote submission completes within 500ms
- "Vote recorded!" confirmation appears
- Vote counts update showing 1 vote for selected option
- Can click another option to change vote

**Actual Behavior** (BUG):
- Vote does NOT submit
- No confirmation message appears
- Vote counts remain at 0
- Browser console shows error (open DevTools F12 → Console tab)

### 7. Verify Bug in Browser Console

Open Browser DevTools (F12) → Console tab:

**Expected Console Error**:
```
Error: Missing required fields: roomCode, participantId, and optionIndex
```

Or you might see:
```
Failed to submit vote
```

### 8. Verify Bug in Backend Logs

Check the backend terminal output:

**Expected Warning Log**:
```json
{
  "level": "warn",
  "socketId": "abc123...",
  "data": {
    "roomCode": "ABC234",
    "nickname": "TestUser",   ← Frontend sent nickname
    "optionIndex": 0
  },
  "msg": "Missing required fields: roomCode, participantId, and optionIndex"
}
```

**Root Cause Confirmation**:
- Backend log shows `nickname: "TestUser"` in the data
- Backend validation expects `participantId` field
- Validation fails → vote rejected

## Quick Verification Without Manual Testing

### Check Frontend Code

```bash
cd frontend
grep -n "submit-vote.*nickname" src/services/socketService.js
```

**Expected Output**:
```
76:    socket.emit('submit-vote', { roomCode, nickname, optionIndex }, response => {
```

This confirms frontend is sending `nickname`.

### Check Backend Code

```bash
cd backend
grep -n "participantId" src/sockets/events/submitVote.js
```

**Expected Output**:
```
17:      const { roomCode, participantId, optionIndex } = data;
20:      if (roomCode === undefined || participantId === undefined || optionIndex === undefined) {
```

This confirms backend expects `participantId`.

## Root Cause Summary

**Parameter Mismatch**:

| Component | Parameter Name | Line Number |
|-----------|---------------|-------------|
| Frontend (sending) | `nickname` | `frontend/src/services/socketService.js:76` |
| Backend (expecting) | `participantId` | `backend/src/sockets/events/submitVote.js:17` |

**Why This Breaks**:
```javascript
// Frontend sends:
{ roomCode: "ABC234", nickname: "TestUser", optionIndex: 0 }

// Backend expects:
{ roomCode: "ABC234", participantId: "12345", optionIndex: 0 }

// Backend validation:
if (participantId === undefined) {  // TRUE - participantId is undefined!
  return error("Missing required fields...");
}
```

## Fix Verification (After Implementation)

After applying the fix, repeat reproduction steps 1-6:

**Expected Behavior After Fix**:
1. Click option → Vote submits successfully
2. "Vote recorded!" confirmation appears within 1 second
3. Vote count updates: "1 vote (100%)" shown
4. Can click another option to change vote
5. No errors in browser console
6. Backend logs show successful vote submission

**Backend Log After Fix**:
```json
{
  "level": "info",
  "socketId": "abc123...",
  "roomCode": "ABC234",
  "participantId": "12345",   ← Now using participantId
  "optionIndex": 0,
  "msg": "Vote recorded and persisted"
}
```

## Clean Up

```bash
# Stop backend (Ctrl+C in backend terminal)
# Stop frontend (Ctrl+C in frontend terminal)

# Optional: Clear session storage in browser
# DevTools → Application → Storage → Session Storage → Clear
```

## Automated Test Reproduction

### Run Contract Test (Should Fail Before Fix)

```bash
cd frontend
npm test -- tests/contract/VotePage.test.js
```

**Expected Result** (before fix):
```
FAIL tests/contract/VotePage.test.js
  ✕ should submit vote when option clicked
    Expected: vote submission with participantId
    Actual: vote submission with nickname
```

### Run Contract Test (Should Pass After Fix)

After implementing fix:

```bash
npm test -- tests/contract/VotePage.test.js
```

**Expected Result** (after fix):
```
PASS tests/contract/VotePage.test.js
  ✓ should submit vote when option clicked (250ms)
  ✓ should display vote confirmation after submission
  ✓ should update vote counts after submission
```

## Debugging Tips

### If Bug Doesn't Reproduce

1. **Clear browser cache and sessionStorage**:
   - DevTools → Application → Storage → Clear site data
   - Refresh page

2. **Verify backend is running correct version**:
   ```bash
   cd backend
   git status  # Should be on 011-fix-vote-submission branch
   ```

3. **Check Network tab** (DevTools → Network):
   - Filter: WS (WebSocket)
   - Look for `submit-vote` message
   - Click on message → Payload → Verify `nickname` vs `participantId`

4. **Enable verbose Socket.io logging** (frontend):
   ```javascript
   // In socketService.js, temporarily add:
   socket.on('connect', () => console.log('Connected:', socket.id));
   socket.onAny((event, ...args) => console.log('Event:', event, args));
   ```

### If sessionStorage is Missing Data

**Check sessionStorage in DevTools**:
- DevTools → Application → Storage → Session Storage → `http://localhost:5173`
- Should see: `roomCode`, `nickname`, `poll`
- After fix should also see: `participantId`

**If missing**, rejoin the poll:
1. Navigate to `/join`
2. Enter room code and nickname
3. Submit

## Related Documentation

- **Root Cause Analysis**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **Contract Specification**: [contracts/vote-submission-contract.md](contracts/vote-submission-contract.md)
- **Implementation Plan**: [plan.md](plan.md)
- **GitHub Issue**: https://github.com/powerfulech0/zephyr/issues/31
