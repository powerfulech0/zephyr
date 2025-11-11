# Research: Service Layer Unit Tests

**Feature**: 006-service-layer-tests
**Date**: 2025-11-10
**Purpose**: Research best practices for mocking external dependencies in Jest unit tests

## Overview

This document consolidates research findings for implementing comprehensive unit tests for the frontend service layer. The primary challenge is properly mocking external dependencies (`fetch` API and `socket.io-client`) to ensure test isolation.

## Research Questions Addressed

1. How to mock the global `fetch` API in Jest?
2. How to mock ES6 module imports (`socket.io-client`)?
3. What are best practices for testing async functions with promises?
4. How to test WebSocket event listeners and callbacks?
5. How to achieve ≥80% coverage for services with complex state management?

---

## Decision 1: Mocking Global `fetch` API

**Decision**: Use `global.fetch = jest.fn()` with `mockResolvedValue` and `mockRejectedValue` for different scenarios

**Rationale**:
- `fetch` is a global browser API available in jsdom environment
- Jest's `jest.fn()` allows per-test customization of responses
- `mockResolvedValue` handles successful responses
- `mockRejectedValue` handles network errors (before response)
- Manual response object creation allows testing both `response.ok` branches

**Alternatives Considered**:
- **jest-fetch-mock**: External library adds dependency, overkill for simple use case
- **MSW (Mock Service Worker)**: Too heavy for unit tests, better suited for integration tests
- **Manual XMLHttpRequest mocking**: `fetch` is standard API, no need to drop down to XHR

**Implementation Pattern**:
```javascript
// In test file
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

test('successful API call', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: 'success' })
  });

  const result = await createPoll('Question', ['A', 'B']);
  expect(result).toEqual({ data: 'success' });
});

test('network error', async () => {
  fetch.mockRejectedValueOnce(new Error('Network failure'));

  await expect(createPoll('Q', ['A'])).rejects.toThrow('Network failure');
});

test('HTTP error response', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Bad request' })
  });

  await expect(createPoll('Q', ['A'])).rejects.toThrow('Bad request');
});
```

---

## Decision 2: Mocking Socket.io Client

**Decision**: Use `jest.mock()` to mock the entire `socket.io-client` module with a fake socket object

**Rationale**:
- `socket.io-client` is an ES6 module import, requires module-level mocking
- Need to control socket behavior: `emit`, `on`, `off`, `connect`, `disconnect`
- Need to simulate connection events: `connect`, `disconnect`, `reconnecting`, `reconnect`, `reconnect_failed`
- Manual mock allows testing event listener registration and cleanup

**Alternatives Considered**:
- **Real socket.io server in tests**: Slow, requires infrastructure, breaks unit test isolation
- **socket.io-client-mock**: External library, not actively maintained
- **Partial mocking with jest.spyOn**: Insufficient control over module initialization

**Implementation Pattern**:
```javascript
// Create mock socket object
const mockSocket = {
  id: 'mock-socket-id',
  connected: true,
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

// Mock the socket.io-client module
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

beforeEach(() => {
  jest.clearAllMocks();

  // Reset socket state
  mockSocket.connected = true;
  mockSocket.id = 'mock-socket-id';
});

test('joinRoom emits correct event', async () => {
  // Setup mock to call acknowledgment callback
  mockSocket.emit.mockImplementation((event, payload, callback) => {
    if (event === 'join-room' && callback) {
      callback({ success: true, poll: { roomCode: 'ABC123' } });
    }
  });

  const result = await joinRoom('ABC123', 'Alice');

  expect(mockSocket.emit).toHaveBeenCalledWith(
    'join-room',
    { roomCode: 'ABC123', nickname: 'Alice' },
    expect.any(Function)
  );
  expect(result).toEqual({ roomCode: 'ABC123' });
});

test('event listener registration', () => {
  const callback = jest.fn();
  onVoteUpdate(callback);

  expect(mockSocket.on).toHaveBeenCalledWith('vote-update', callback);
});

test('connection event handling', () => {
  // Simulate connect event
  const connectHandler = mockSocket.on.mock.calls.find(
    call => call[0] === 'connect'
  )[1];

  connectHandler();

  // Verify connection status callback was invoked
  expect(connectionStatusCallbacks).toHaveBeenCalled();
});
```

---

## Decision 3: Testing Async Promise-Based Functions

**Decision**: Use `async/await` with Jest's `expect().rejects` and `expect().resolves` matchers

**Rationale**:
- Service functions return Promises (async/await pattern)
- Jest has built-in Promise handling
- `await expect(promise).rejects.toThrow()` is more readable than `.catch()`
- `async` test functions automatically wait for Promises to settle

**Alternatives Considered**:
- **done callback**: Deprecated pattern in Jest, verbose
- **return promise**: Works but less readable than async/await
- **.then()/.catch() chains**: Harder to read, error-prone

**Implementation Pattern**:
```javascript
test('successful async call', async () => {
  const result = await submitVote('ABC123', 'Alice', 0);
  expect(result).toBeUndefined(); // void return
});

test('async error', async () => {
  await expect(
    submitVote('INVALID', 'Alice', 0)
  ).rejects.toThrow('Invalid room code');
});
```

---

## Decision 4: Testing sessionStorage Interaction

**Decision**: Mock `sessionStorage` with Jest's `Storage` implementation or manual mock

**Rationale**:
- `sessionStorage` is used in socketService for auto-rejoin on reconnect
- jsdom provides `sessionStorage`, but it persists between tests
- Need to control values and verify get/set calls

**Alternatives Considered**:
- **Use jsdom's built-in sessionStorage**: State leaks between tests
- **No mocking, accept side effects**: Breaks test isolation

**Implementation Pattern**:
```javascript
beforeEach(() => {
  sessionStorage.clear();
});

test('auto-rejoin uses sessionStorage', () => {
  sessionStorage.setItem('roomCode', 'ABC123');
  sessionStorage.setItem('nickname', 'Alice');

  // Simulate reconnection
  const connectHandler = mockSocket.on.mock.calls.find(
    call => call[0] === 'connect'
  )[1];
  connectHandler();

  expect(mockSocket.emit).toHaveBeenCalledWith(
    'join-room',
    { roomCode: 'ABC123', nickname: 'Alice' },
    expect.any(Function)
  );
});

test('handles missing sessionStorage gracefully', () => {
  sessionStorage.clear();

  const connectHandler = mockSocket.on.mock.calls.find(
    call => call[0] === 'connect'
  )[1];
  connectHandler();

  // Should not emit join-room without session data
  expect(mockSocket.emit).not.toHaveBeenCalled();
});
```

---

## Decision 5: Coverage Strategy

**Decision**: Target ≥80% across all metrics by testing all exported functions, branches, and error paths

**Rationale**:
- Coverage metrics: statements, branches, functions, lines
- apiService has 3 functions: `createPoll`, `getPoll`, `checkHealth`
- socketService has 15+ exported functions plus internal event handlers
- Each function needs: success case, error cases, edge cases
- Branch coverage requires testing both `if` and `else` paths

**Coverage Targets by Function**:

**apiService.js** (3 functions, ~40 LOC):
- `createPoll`: Success, network error, 400/500 response, malformed JSON
- `getPoll`: Success, network error, 404 response, malformed JSON
- `checkHealth`: Success, network error, server down

**socketService.js** (15+ exports, ~160 LOC):
- Event emitters: `joinSocketRoom`, `joinRoom`, `submitVote`, `changePollState`
  - Success callbacks, error callbacks, timeout scenarios
- Event listeners: `on*` functions (6 functions)
  - Register callbacks, verify event name
- Event cleanup: `off*` functions (4 functions)
  - Remove specific callback, verify filter logic
- Connection status: `onConnectionStatus`, `offConnectionStatus`, `getConnectionStatus`
  - Test callback registration/removal, test current status
- Reconnection: `onReconnecting`, `offReconnecting`
  - Test callback registration/removal
- Disconnect: `disconnect()`
  - Verify socket.disconnect() called
- Internal event handlers: connect, disconnect, reconnecting, reconnect, reconnect_failed
  - Simulate events, verify callbacks invoked

**Implementation Pattern**:
```javascript
describe('apiService', () => {
  describe('createPoll', () => {
    test('success case', async () => { /* ... */ });
    test('network error', async () => { /* ... */ });
    test('400 error response', async () => { /* ... */ });
    test('500 error response', async () => { /* ... */ });
    test('malformed JSON response', async () => { /* ... */ });
  });

  describe('getPoll', () => {
    // Similar structure...
  });

  describe('checkHealth', () => {
    // Similar structure...
  });
});

describe('socketService', () => {
  describe('event emission', () => {
    test('joinRoom success', async () => { /* ... */ });
    test('joinRoom error', async () => { /* ... */ });
    // ...
  });

  describe('event listeners', () => {
    test('onVoteUpdate registers listener', () => { /* ... */ });
    // ...
  });

  describe('connection management', () => {
    test('connect event triggers callbacks', () => { /* ... */ });
    test('disconnect event triggers callbacks', () => { /* ... */ });
    test('auto-rejoin on reconnect', () => { /* ... */ });
    // ...
  });
});
```

---

## Testing Best Practices Applied

1. **Arrange-Act-Assert Pattern**: Clear separation of setup, execution, verification
2. **Test Isolation**: Each test has independent mocks, no shared state
3. **Descriptive Names**: Test names describe scenario and expected outcome
4. **Mock Cleanup**: `beforeEach(() => jest.clearAllMocks())` prevents test pollution
5. **Coverage Focus**: Every branch, every error path, every exported function
6. **Reference Pattern**: Follow existing `tests/contract/HostDashboard.test.js` structure

---

## Dependencies (Already Installed)

All testing dependencies are already configured from feature #004:

- `jest@30.x` - Test framework
- `@testing-library/react` - React testing utilities (not needed for services, but available)
- `@testing-library/jest-dom` - DOM matchers (not needed for services, but available)
- `babel-jest` - ES6+ module transformation
- `identity-obj-proxy` - CSS module mocking (not needed for services)

**No new dependencies required** ✅

---

## Implementation Checklist

Based on research findings, implementation must include:

- [x] Research fetch mocking patterns
- [x] Research socket.io-client mocking patterns
- [x] Research async testing patterns
- [x] Research sessionStorage mocking
- [x] Define coverage strategy
- [ ] Create `frontend/tests/unit/apiService.test.js` (implementation phase)
- [ ] Create `frontend/tests/unit/socketService.test.js` (implementation phase)
- [ ] Verify ≥80% coverage for both files (verification phase)
- [ ] Document patterns in contracts/ (next phase)

---

## References

- Jest Mocking Documentation: https://jestjs.io/docs/mock-functions
- Jest Async Testing: https://jestjs.io/docs/asynchronous
- Existing Pattern: `frontend/tests/contract/HostDashboard.test.js`
- Feature #004 Test Infrastructure: `specs/004-frontend-test-infrastructure/`
