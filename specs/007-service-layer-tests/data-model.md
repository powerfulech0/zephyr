# Test Structure: Service Layer Unit Tests

**Feature**: 007-service-layer-tests
**Date**: 2025-11-10
**Purpose**: Document test suite structure and test case organization

## Overview

This document defines the structure and organization of unit tests for the frontend service layer. Since this is a testing infrastructure feature, this file documents test suites instead of data entities.

---

## Test Suite 1: apiService.test.js

**Purpose**: Unit tests for `frontend/src/services/apiService.js`
**Target Coverage**: ≥80% across all metrics
**Functions Under Test**: `createPoll`, `getPoll`, `checkHealth`

### Test Structure

```javascript
describe('apiService', () => {
  // Setup and teardown
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('createPoll', () => {
    // Success scenarios
    test('creates poll with valid data', async () => { });
    test('sends correct request headers', async () => { });
    test('includes API_URL in request', async () => { });

    // Error scenarios
    test('handles network error before response', async () => { });
    test('handles 400 error response', async () => { });
    test('handles 500 error response', async () => { });
    test('handles malformed JSON response', async () => { });
    test('throws error with message from API', async () => { });
    test('throws default error when API error missing', async () => { });
  });

  describe('getPoll', () => {
    // Success scenarios
    test('retrieves poll by room code', async () => { });
    test('sends GET request to correct endpoint', async () => { });

    // Error scenarios
    test('handles 404 not found', async () => { });
    test('handles network error', async () => { });
    test('handles malformed JSON response', async () => { });
    test('throws error with message from API', async () => { });
    test('throws default error when API error missing', async () => { });
  });

  describe('checkHealth', () => {
    // Success scenarios
    test('returns health check data', async () => { });
    test('sends request to /api/health endpoint', async () => { });

    // Edge cases
    test('returns data even if response not ok', async () => { });
    test('handles JSON parsing errors gracefully', async () => { });
  });
});
```

**Estimated Test Count**: 20 test cases
**Key Assertions**:
- Request URL correctness (`expect(fetch).toHaveBeenCalledWith(...)`)
- Request headers and body
- Response parsing (`expect(result).toEqual(...)`)
- Error throwing (`await expect(...).rejects.toThrow(...)`)
- Error message extraction from API responses

---

## Test Suite 2: socketService.test.js

**Purpose**: Unit tests for `frontend/src/services/socketService.js`
**Target Coverage**: ≥80% across all metrics
**Functions Under Test**: 15+ exported functions + internal event handlers

### Test Structure

```javascript
describe('socketService', () => {
  // Mock socket object
  const mockSocket = {
    id: 'mock-id',
    connected: true,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockSocket.connected = true;
  });

  describe('module initialization', () => {
    test('creates socket with correct URL', () => { });
    test('configures reconnection settings', () => { });
    test('sets up connection event handlers', () => { });
  });

  describe('event emission (promise-based)', () => {
    describe('joinRoom', () => {
      test('emits join-room event with correct payload', async () => { });
      test('resolves with poll data on success', async () => { });
      test('rejects with error message on failure', async () => { });
    });

    describe('submitVote', () => {
      test('emits submit-vote event with correct payload', async () => { });
      test('resolves on success', async () => { });
      test('rejects with error on failure', async () => { });
    });

    describe('changePollState', () => {
      test('emits change-poll-state event', async () => { });
      test('resolves with new state on success', async () => { });
      test('rejects with error on failure', async () => { });
    });

    describe('joinSocketRoom', () => {
      test('emits join event with room code', () => { });
    });
  });

  describe('event listeners (registration)', () => {
    test('onParticipantJoined registers listener', () => { });
    test('onParticipantLeft registers listener', () => { });
    test('onVoteUpdate registers listener', () => { });
    test('onPollStateChanged registers listener', () => { });
    test('onConnectionStatus adds callback to array', () => { });
    test('onReconnecting adds callback to array', () => { });
  });

  describe('event listeners (cleanup)', () => {
    test('offParticipantJoined removes listener', () => { });
    test('offParticipantLeft removes listener', () => { });
    test('offVoteUpdate removes listener', () => { });
    test('offPollStateChanged removes listener', () => { });
    test('offConnectionStatus filters out callback', () => { });
    test('offReconnecting filters out callback', () => { });
  });

  describe('connection event handlers', () => {
    test('connect event triggers connection status callbacks', () => { });
    test('connect event auto-rejoins with sessionStorage data', () => { });
    test('connect event skips rejoin when no session data', () => { });
    test('disconnect event triggers connection status callbacks', () => { });
    test('reconnecting event triggers reconnecting callbacks', () => { });
    test('reconnect event triggers reconnecting callbacks', () => { });
    test('reconnect_failed event triggers connection status callbacks', () => { });
  });

  describe('connection status', () => {
    test('getConnectionStatus returns socket.connected', () => { });
    test('getConnectionStatus reflects disconnected state', () => { });
  });

  describe('disconnect', () => {
    test('calls socket.disconnect()', () => { });
  });

  describe('edge cases', () => {
    test('handles multiple listeners for same event', () => { });
    test('handles listener removal when callback not found', () => { });
    test('handles failed rejoin acknowledgment', () => { });
    test('handles missing sessionStorage gracefully', () => { });
  });
});
```

**Estimated Test Count**: 35-40 test cases
**Key Assertions**:
- Socket method calls (`expect(mockSocket.emit).toHaveBeenCalledWith(...)`)
- Promise resolution/rejection
- Callback registration (`expect(mockSocket.on).toHaveBeenCalled()`)
- Callback removal (`expect(mockSocket.off).toHaveBeenCalled()`)
- Array filtering for custom callbacks
- sessionStorage interaction
- Event handler behavior (simulate events, verify callbacks invoked)

---

## Mock Structures

### Global fetch Mock

```javascript
global.fetch = jest.fn();

// Success response structure
fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ /* response data */ })
});

// Error response structure
fetch.mockResolvedValueOnce({
  ok: false,
  json: async () => ({ error: 'Error message' })
});

// Network error structure
fetch.mockRejectedValueOnce(new Error('Network failure'));
```

### Socket.io Client Mock

```javascript
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

const mockSocket = {
  id: 'mock-socket-id',
  connected: true,
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

// Simulate acknowledgment callback
mockSocket.emit.mockImplementation((event, payload, callback) => {
  if (callback) {
    callback({ success: true, /* response data */ });
  }
});

// Simulate event handlers
const connectHandler = mockSocket.on.mock.calls.find(
  call => call[0] === 'connect'
)[1];
connectHandler(); // Trigger connect event
```

---

## Coverage Metrics Tracking

### Baseline (Before Implementation)

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| apiService.js | 0% | 0% | 0% | 0% |
| socketService.js | 0% | 0% | 0% | 0% |

### Target (After Implementation)

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| apiService.js | ≥80% | ≥80% | ≥80% | ≥80% |
| socketService.js | ≥80% | ≥80% | ≥80% | ≥80% |

### Verification Command

```bash
cd frontend
npm test -- --coverage --collectCoverageFrom='src/services/*.js'
```

---

## Test Execution Order

Tests should be executed in this order during implementation:

1. **apiService.test.js** (simpler, fewer dependencies)
   - Create poll tests
   - Get poll tests
   - Check health tests
   - Verify ≥80% coverage

2. **socketService.test.js** (complex, many exports)
   - Module initialization tests
   - Event emission tests
   - Event listener registration tests
   - Event listener cleanup tests
   - Connection event handler tests
   - Edge case tests
   - Verify ≥80% coverage

3. **Overall coverage verification**
   - Run full test suite
   - Verify improved overall coverage
   - Check test execution time (<10s target)

---

## Test Naming Convention

Follow this pattern for consistency:

```javascript
test('[function] [scenario] [expected result]', () => { });

// Examples:
test('createPoll throws error when network fails', async () => { });
test('joinRoom resolves with poll data on success', async () => { });
test('onVoteUpdate registers listener on socket', () => { });
test('offConnectionStatus removes callback from array', () => { });
```

---

## Assertions Reference

### Common Assertions for apiService

```javascript
// Function called with correct args
expect(fetch).toHaveBeenCalledWith(
  'http://localhost:4000/api/polls',
  expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, options })
  })
);

// Promise resolves to value
expect(result).toEqual(expectedData);

// Promise rejects with error
await expect(createPoll(q, opts)).rejects.toThrow('Error message');

// Error message extraction
await expect(getPoll('BAD')).rejects.toThrow('Failed to get poll');
```

### Common Assertions for socketService

```javascript
// Socket method called
expect(mockSocket.emit).toHaveBeenCalledWith(
  'join-room',
  { roomCode, nickname },
  expect.any(Function)
);

// Event listener registered
expect(mockSocket.on).toHaveBeenCalledWith('vote-update', callback);

// Event listener removed
expect(mockSocket.off).toHaveBeenCalledWith('vote-update', callback);

// Callback array filtering
expect(connectionStatusCallbacks).not.toContain(callback);

// Socket property access
expect(getConnectionStatus()).toBe(true);

// sessionStorage interaction
expect(sessionStorage.getItem('roomCode')).toBe('ABC123');
```

---

## Quality Gates

Before marking tests complete:

- [ ] All tests pass (`npm test`)
- [ ] ≥80% coverage for apiService.js
- [ ] ≥80% coverage for socketService.js
- [ ] Test execution time <10 seconds
- [ ] No console.log or debug statements
- [ ] All mocks properly cleaned up in beforeEach
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Test names clearly describe scenario and expected outcome
- [ ] ESLint passes with no errors
- [ ] Prettier formatting applied
