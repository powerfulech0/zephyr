# Data Model: Fix Failing Integration Tests

**Feature**: 006-fix-integration-tests
**Date**: 2025-11-10

## Overview

This feature is a bug fix for test infrastructure and does not introduce new data models. However, it does involve understanding existing data structures used in tests and components.

## Existing Entities Referenced

### PollState (Component Prop)

**Source**: React component props in `PollControls.jsx`, `HostDashboard`, and test mocks

**Fields**:
- `state` (string): Poll lifecycle state - one of 'waiting', 'open', 'closed'
- Additional context (not directly used in PollControls but part of poll object):
  - `roomCode` (string): 6-character room identifier
  - `question` (string): Poll question text
  - `options` (array of strings): Poll options for voting

**Validation Rules**:
- `state` must be one of: 'waiting', 'open', 'closed'
- Current implementation: PropTypes marks `pollState` as required (line 49 of PollControls.jsx)
- **Fix required**: Make `pollState` optional or ensure it's always provided with valid default

**State Transitions**:
```
waiting → open (host clicks "Open Voting")
open → closed (host clicks "Close Voting")
closed → [terminal state, no transitions]
```

**Usage in Components**:
- `PollControls.jsx`: Renders control button based on state, displays state in UI
- `HostDashboard.jsx`: Manages poll state after creation
- `VotePage.jsx`: Shows voting UI or "closed" message based on state

### Socket Service Mock Interface

**Source**: `frontend/src/services/__mocks__/socketService.js`

**Exported Functions** (all jest.fn()):
- `joinSocketRoom(roomCode)` - **[FIX: Already exported, verify usage]**
- `joinRoom(roomCode, nickname)` - Returns Promise
- `submitVote(roomCode, nickname, optionIndex)` - Returns Promise
- `changePollState(roomCode, newState)` - Returns Promise
- Event listeners: `onParticipantJoined`, `onParticipantLeft`, `onVoteUpdate`, `onPollStateChanged`
- Event unsubscribers: `offParticipantJoined`, `offParticipantLeft`, `offVoteUpdate`, `offPollStateChanged`
- Connection management: `disconnect`, `onConnectionStatus`, `offConnectionStatus`, `onReconnecting`, `offReconnecting`, `getConnectionStatus`

**Mock Implementation Requirements**:
- All functions must be callable (jest.fn())
- Promise-based functions should resolve successfully in happy path tests
- No actual WebSocket connections needed
- State is not tracked in mock (stateless)

## Data Flow in Tests

### Host Poll Control Flow Test (userFlows.test.js:209-248)

```
1. Mock createPoll API call → returns poll object {roomCode, question, options, state: 'waiting'}
2. Render HostDashboard component
3. Fill form inputs (question, options)
4. Click "Create Poll" button
5. Component calls createPoll API (mocked)
6. Component receives poll object, renders PollControls
7. PollControls displays "Open Voting" button (state === 'waiting')
8. Test clicks "Open Voting" button
9. Component calls changePollState(roomCode, 'open') via socket service
10. Verify changePollState was called with correct parameters
```

**Fix Required**: Step 6 may be failing if poll object is not properly set in component state, causing PollControls to receive undefined pollState.

### Component Rendering Flow

```
Test: render(<BrowserRouter><HostDashboard /></BrowserRouter>)
  ↓
HostDashboard mounts
  ↓
Initial state: poll = null (no poll created yet)
  ↓
Form renders with empty inputs
  ↓
Test fills inputs and submits
  ↓
createPoll API called (mocked)
  ↓
Mock returns { poll: {...} }
  ↓
Component updates state: this.setState({ poll: mockPoll, ... })
  ↓
PollControls renders with pollState={poll.state}
  ↓
If poll is null or undefined → PollControls receives undefined → ERROR
```

**Fix Required**: Ensure PollControls handles undefined pollState gracefully during initial render or loading states.

## No Schema Changes

This feature does not modify:
- Database schemas
- API contracts
- WebSocket event schemas
- LocalStorage/SessionStorage structures

All data structures remain unchanged. Fixes are limited to:
1. Mock function exports (already exist, verify correct usage)
2. Component prop handling (add defensive null checks)
3. Test setup (ensure proper async handling)

## Validation Rules Applied

### Component PropTypes (Existing)

**PollControls.jsx**:
```javascript
PollControls.propTypes = {
  pollState: PropTypes.string.isRequired,  // ⚠️ Should be optional
  onOpenPoll: PropTypes.func.isRequired,
  onClosePoll: PropTypes.func.isRequired,
};
```

**Recommended Fix**:
```javascript
PollControls.propTypes = {
  pollState: PropTypes.string,  // Make optional
  onOpenPoll: PropTypes.func.isRequired,
  onClosePoll: PropTypes.func.isRequired,
};
```

### Runtime Validation (Existing in Component)

**PollControls.jsx:42**:
```javascript
{pollState?.toUpperCase() || 'UNKNOWN'}
```

Already uses optional chaining and fallback - good defensive coding!

**PollControls.jsx:8-22 (getButtonConfig)**:
Uses switch statement with default case - handles unexpected states safely.

## Summary

- **No new data models introduced**
- **No schema changes required**
- **Existing entities**: PollState (component prop), Socket Service Mock interface
- **Fixes required**:
  1. Verify socket mock exports (already present)
  2. Make pollState optional in PropTypes (align with defensive code)
  3. Ensure components handle undefined state during loading/initial render

All data flows and validation rules already exist. This feature ensures they work correctly in test environments.
