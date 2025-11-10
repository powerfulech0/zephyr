# Test Contracts: Fix Failing Integration Tests

**Feature**: 006-fix-integration-tests
**Date**: 2025-11-10

## Overview

This document defines the contracts (expected behavior) for the fixes applied to failing integration tests. Since this is a bug fix feature, there are no new API or WebSocket contracts. Instead, we document the expected test behavior and component contracts.

## Test Success Criteria Contracts

### TC-001: Host Poll Control Flow Test

**Test File**: `frontend/tests/integration/userFlows.test.js:209-248`

**Test Name**: "should allow host to change poll state from waiting to open"

**Contract**:
```javascript
GIVEN a host has created a poll with state='waiting'
WHEN the host clicks the "Open Voting" button
THEN changePollState(roomCode, 'open') is called
AND the call completes without errors
```

**Success Criteria**:
- Test passes without "joinSocketRoom is not a function" error
- Test passes without "Unable to find elements" error
- `changePollState` mock is called exactly once with correct arguments
- No console errors or warnings

**Dependencies**:
- Socket service mock exports `joinSocketRoom`
- HostDashboard component renders correctly after poll creation
- PollControls component renders with valid pollState

### TC-002: Component Rendering Contract

**Affected Tests**: All tests in `userFlows.test.js` that render components

**Contract**:
```javascript
GIVEN a React component is rendered in a test
WHEN the component mounts
THEN the DOM contains expected elements (not empty <div />)
AND no uncaught errors are thrown
AND all expected elements are queryable
```

**Success Criteria**:
- No "Unable to find elements, DOM is empty" errors
- `screen.getByText(...)` queries succeed for expected elements
- `screen.getByLabelText(...)` queries succeed for form inputs
- Components render within expected timeframe (default 1000ms timeout)

**Root Cause**:
- Components may be failing to render due to missing required props
- Async state updates may not be properly awaited
- Error boundaries may be catching errors silently

**Fix Approach**:
1. Ensure all required props are provided in tests
2. Use `waitFor` for async state updates
3. Add debug output to identify rendering failures

### TC-003: PollControls Defensive Null Handling

**Component**: `frontend/src/components/PollControls.jsx`

**Contract**:
```javascript
GIVEN PollControls receives undefined or null pollState
WHEN the component renders
THEN it displays fallback UI without throwing errors
AND shows "UNKNOWN" for undefined state (line 42)
AND renders "Open Voting" button as default (line 21)
```

**Success Criteria**:
- No "Cannot read properties of undefined" errors
- PropTypes validation aligned with actual prop usage
- Component handles all possible pollState values: 'waiting', 'open', 'closed', undefined, null

**Current Implementation Status**:
- ✅ Line 42: `pollState?.toUpperCase() || 'UNKNOWN'` - Already defensive
- ✅ Line 21: Default case in switch returns 'Open Voting' - Already defensive
- ⚠️ Line 49: PropTypes marks `pollState` as required - **Inconsistent with defensive code**

**Fix Required**:
```javascript
// Current (line 49)
pollState: PropTypes.string.isRequired,

// Fixed
pollState: PropTypes.string,  // Optional, defaults handled in component
```

## Socket Service Mock Contract

### Mock Function Exports

**File**: `frontend/src/services/__mocks__/socketService.js`

**Contract**: All exported functions from real `socketService.js` must be exported from mock

**Required Exports** (verified against real service):
- ✅ `joinSocketRoom` - Exported at line 2 of mock
- ✅ `joinRoom` - Exported at line 3 of mock
- ✅ `submitVote` - Exported at line 4 of mock
- ✅ `changePollState` - Exported at line 5 of mock
- ✅ Event listeners (onParticipantJoined, etc.) - Exported at lines 6-9, 15-18
- ✅ Cleanup functions (offParticipantJoined, etc.) - Exported at lines 10-13, 16-18
- ✅ Connection functions (disconnect, onConnectionStatus, etc.) - Exported at lines 14-19

**Mock Behavior**:
```javascript
// All functions are jest.fn() for call tracking
expect(joinSocketRoom).toHaveBeenCalledWith('AB3K9T');
expect(changePollState).toHaveBeenCalledWith('AB3K9T', 'open');

// Promise-based functions resolve successfully by default
joinRoom.mockResolvedValue({ success: true, poll: {...} });
submitVote.mockResolvedValue();
changePollState.mockResolvedValue({ state: 'open' });
```

**Current Status**: All functions already exported. Likely a test setup issue if tests are failing.

## Integration Test Flow Contracts

### Flow 1: Host Creates Poll → Opens Voting

**Contract**:
```
1. User renders HostDashboard
   → Expected: Form with question input, option inputs visible

2. User fills question input
   → Expected: Input value updates

3. User fills option inputs (at least 2)
   → Expected: Input values update

4. User clicks "Create Poll" button
   → Expected: createPoll(question, options) called
   → Expected: Component state updates with poll object
   → Expected: PollControls component renders

5. User sees "Open Voting" button
   → Expected: Button is enabled and clickable

6. User clicks "Open Voting" button
   → Expected: changePollState(roomCode, 'open') called
   → Expected: No errors thrown
```

**Success Criteria**: All steps complete without errors, all assertions pass

### Flow 2: Participant Views Poll

**Contract**:
```
1. SessionStorage contains poll data
   → Expected: sessionStorage.getItem('poll') returns valid JSON

2. User renders VotePage
   → Expected: Poll question displayed
   → Expected: Poll options displayed as buttons
   → Expected: Nickname and room code displayed
   → Expected: Connection status indicator shows "🟢 Connected"

3. If poll state is 'closed'
   → Expected: "🔒 Voting has been closed" message displayed
   → Expected: Option buttons disabled or hidden
```

**Success Criteria**: All elements render correctly, state-dependent UI matches poll state

## Validation Contracts

### VC-001: Form Validation (Existing Tests)

**Contract**: These tests should continue to pass after fixes

- Missing question → "Question is required" error
- Less than 2 options → "At least 2 options must have text" error

### VC-002: PropTypes Validation

**Contract**: After fixes, PropTypes should not show warnings for valid usage

**Before Fix**:
```
Warning: Failed prop type: The prop `pollState` is marked as required in `PollControls`,
but its value is `undefined`.
```

**After Fix**:
No PropTypes warnings when pollState is undefined (valid loading state)

## Test Cleanup Contract

### Mock Cleanup Between Tests

**Contract**:
```javascript
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Expected Behavior**:
- All mock function call counts reset to 0
- Mock resolved/rejected values reset to defaults
- No state pollution between tests

**Verification**:
```javascript
expect(createPoll).toHaveBeenCalledTimes(1);  // Not 2, not 0
```

## Summary

**Total Contracts Defined**: 3 test contracts, 1 component contract, 1 mock contract

**No Breaking Changes**: All existing passing tests must continue to pass

**Success Metric**:
- All 3 failing tests in `userFlows.test.js` pass
- 0 new test failures introduced
- 0 console errors or warnings
- Test coverage maintained or improved

**Implementation Checklist**:
- [ ] Verify socket mock exports (already exported, check test setup)
- [ ] Fix PollControls PropTypes (make pollState optional)
- [ ] Debug component rendering (ensure proper state initialization)
- [ ] Ensure async operations use waitFor
- [ ] Run tests and verify all pass
