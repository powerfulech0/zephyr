# Test Contract: socketService.js

**File Under Test**: `frontend/src/services/socketService.js`
**Test File**: `frontend/tests/unit/socketService.test.js`
**Coverage Target**: ≥80% across all metrics

## Purpose

This contract defines the expected behavior and test coverage requirements for the socket service unit tests. The socket service manages real-time WebSocket communication, event handling, reconnection logic, and session persistence.

---

## Module Initialization

**Module-level code (executed on import)**:
- Creates socket instance via `io(SOCKET_URL, config)`
- Registers connection event handlers: `connect`, `disconnect`, `reconnecting`, `reconnect`, `reconnect_failed`
- Initializes callback arrays: `connectionStatusCallbacks`, `reconnectingCallbacks`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| INIT-001 | Socket creation | `io()` called with correct URL and config | Initialization |
| INIT-002 | Reconnection config | Config includes `reconnection: true`, retry settings | Configuration |
| INIT-003 | Event handlers registered | All 5 connection events have handlers | Event setup |

---

## Event Emission Functions (Promise-based)

### 1. joinRoom(roomCode, nickname)

**Purpose**: Join a poll room as a participant with nickname tracking

**Input**:
- `roomCode`: string
- `nickname`: string

**Output**:
- **Success**: Promise resolves to poll object
- **Error**: Promise rejects with Error

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| JR-001 | Success callback | Resolves with poll data when `response.success === true` | Success path |
| JR-002 | Error callback | Rejects with error when `response.success === false` | Error path |
| JR-003 | Emit payload | Emits `'join-room'` with `{ roomCode, nickname }` | Request validation |
| JR-004 | Acknowledgment function | Third argument is callback function | Callback pattern |

---

### 2. submitVote(roomCode, nickname, optionIndex)

**Purpose**: Submit or change a vote

**Input**:
- `roomCode`: string
- `nickname`: string
- `optionIndex`: number

**Output**:
- **Success**: Promise resolves (void)
- **Error**: Promise rejects with Error

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| SV-001 | Success callback | Resolves when `response.success === true` | Success path |
| SV-002 | Error callback | Rejects when `response.success === false` | Error path |
| SV-003 | Emit payload | Emits `'submit-vote'` with correct payload | Request validation |
| SV-004 | Acknowledgment function | Third argument is callback function | Callback pattern |

---

### 3. changePollState(roomCode, newState)

**Purpose**: Change poll state (host action)

**Input**:
- `roomCode`: string
- `newState`: string ('waiting', 'open', 'closed')

**Output**:
- **Success**: Promise resolves to new state string
- **Error**: Promise rejects with Error

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| CPS-001 | Success callback | Resolves with `response.state` when successful | Success path |
| CPS-002 | Error callback | Rejects when `response.success === false` | Error path |
| CPS-003 | Emit payload | Emits `'change-poll-state'` with correct payload | Request validation |

---

### 4. joinSocketRoom(roomCode)

**Purpose**: Simple room join for host (no nickname)

**Input**:
- `roomCode`: string

**Output**: void (fire-and-forget)

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| JSR-001 | Emit event | Emits `'join'` with roomCode | Request validation |
| JSR-002 | No callback | No acknowledgment callback provided | Pattern validation |

---

## Event Listener Functions

### 5-8. Event Registration (on*)

**Functions**:
- `onParticipantJoined(callback)`
- `onParticipantLeft(callback)`
- `onVoteUpdate(callback)`
- `onPollStateChanged(callback)`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| ON-001 | onParticipantJoined | Calls `socket.on('participant-joined', callback)` | Listener registration |
| ON-002 | onParticipantLeft | Calls `socket.on('participant-left', callback)` | Listener registration |
| ON-003 | onVoteUpdate | Calls `socket.on('vote-update', callback)` | Listener registration |
| ON-004 | onPollStateChanged | Calls `socket.on('poll-state-changed', callback)` | Listener registration |

---

### 9-12. Event Cleanup (off*)

**Functions**:
- `offParticipantJoined(callback)`
- `offParticipantLeft(callback)`
- `offVoteUpdate(callback)`
- `offPollStateChanged(callback)`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| OFF-001 | offParticipantJoined | Calls `socket.off('participant-joined', callback)` | Listener cleanup |
| OFF-002 | offParticipantLeft | Calls `socket.off('participant-left', callback)` | Listener cleanup |
| OFF-003 | offVoteUpdate | Calls `socket.off('vote-update', callback)` | Listener cleanup |
| OFF-004 | offPollStateChanged | Calls `socket.off('poll-state-changed', callback)` | Listener cleanup |

---

## Connection Status Functions

### 13-14. Connection Status Callbacks

**Functions**:
- `onConnectionStatus(callback)` - Adds callback to array
- `offConnectionStatus(callback)` - Removes callback from array

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| CS-001 | onConnectionStatus | Pushes callback to `connectionStatusCallbacks` array | Array mutation |
| CS-002 | offConnectionStatus | Filters callback out of array | Array filtering |
| CS-003 | offConnectionStatus (not found) | Handles removal of non-existent callback gracefully | Edge case |

---

### 15-16. Reconnecting Callbacks

**Functions**:
- `onReconnecting(callback)` - Adds callback to array
- `offReconnecting(callback)` - Removes callback from array

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| RC-001 | onReconnecting | Pushes callback to `reconnectingCallbacks` array | Array mutation |
| RC-002 | offReconnecting | Filters callback out of array | Array filtering |

---

### 17. getConnectionStatus()

**Purpose**: Get current connection state

**Output**: boolean (socket.connected)

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| GCS-001 | Connected state | Returns `true` when `socket.connected === true` | State query |
| GCS-002 | Disconnected state | Returns `false` when `socket.connected === false` | State query |

---

### 18. disconnect()

**Purpose**: Manually disconnect socket

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| DC-001 | Disconnect call | Calls `socket.disconnect()` | Method delegation |

---

## Internal Event Handlers

### Connection Event: 'connect'

**Behavior**:
1. Invokes all `connectionStatusCallbacks` with `{ status: 'connected', socketId }`
2. Retrieves `roomCode` and `nickname` from sessionStorage
3. If both exist, emits `'join-room'` to auto-rejoin
4. Handles failed rejoin silently

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| CONN-001 | Callback invocation | All connection status callbacks called with correct data | Callback execution |
| CONN-002 | Auto-rejoin (session exists) | Emits `'join-room'` with session data | Auto-rejoin logic |
| CONN-003 | No auto-rejoin (no session) | Does not emit `'join-room'` | Edge case |
| CONN-004 | Failed rejoin | Handles `response.success === false` without throwing | Error tolerance |

---

### Connection Event: 'disconnect'

**Behavior**:
1. Invokes all `connectionStatusCallbacks` with `{ status: 'disconnected', reason }`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| DISC-001 | Callback invocation | All connection status callbacks called with disconnect data | Callback execution |

---

### Connection Event: 'reconnecting'

**Behavior**:
1. Invokes all `reconnectingCallbacks` with `{ attempting: true, attemptNumber }`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| RECO-001 | Callback invocation | All reconnecting callbacks called with attempt data | Callback execution |

---

### Connection Event: 'reconnect'

**Behavior**:
1. Invokes all `reconnectingCallbacks` with `{ attempting: false, attemptNumber }`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| RECS-001 | Callback invocation | All reconnecting callbacks called with success data | Callback execution |

---

### Connection Event: 'reconnect_failed'

**Behavior**:
1. Invokes all `connectionStatusCallbacks` with `{ status: 'failed', reason: 'Max attempts reached' }`

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| RECF-001 | Callback invocation | All connection status callbacks called with failure data | Callback execution |

---

## Mock Configuration

### Socket.io Client Mock Setup

```javascript
// Mock socket object
const mockSocket = {
  id: 'mock-socket-id',
  connected: true,
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

// Mock the module
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockSocket.connected = true;
  mockSocket.id = 'mock-socket-id';
});
```

### Simulating Acknowledgment Callbacks

```javascript
mockSocket.emit.mockImplementation((event, payload, callback) => {
  if (event === 'join-room' && callback) {
    callback({ success: true, poll: { roomCode: 'ABC123' } });
  }
});
```

### Simulating Connection Events

```javascript
// Find the 'connect' event handler registered during module initialization
const connectHandler = mockSocket.on.mock.calls.find(
  call => call[0] === 'connect'
)[1];

// Trigger the handler
connectHandler();
```

---

## Coverage Metrics

### Required Coverage

| Metric | Target | Notes |
|--------|--------|-------|
| Statements | ≥80% | High line count due to event handlers |
| Branches | ≥80% | Many conditional paths (session storage, callbacks) |
| Functions | ≥80% | 18+ exported functions + 5 event handlers |
| Lines | ≥80% | ~160 LOC total |

### Critical Coverage Areas

**Must achieve 100% coverage**:
- All exported functions (18 functions)
- Event emission with acknowledgments
- Event listener registration/cleanup

**Must achieve ≥80% coverage**:
- Internal event handlers (may have unreachable error paths)
- sessionStorage interaction (handles missing storage gracefully)

---

## Test Execution

### Run Tests
```bash
cd frontend
npm test -- socketService.test.js
```

### Check Coverage
```bash
npm test -- socketService.test.js --coverage --collectCoverageFrom='src/services/socketService.js'
```

### Expected Output
```
PASS  tests/unit/socketService.test.js
  socketService
    module initialization
      ✓ creates socket with correct URL (Xms)
      ✓ configures reconnection settings (Xms)
      ✓ sets up connection event handlers (Xms)
    event emission (promise-based)
      joinRoom
        ✓ emits join-room event with correct payload (Xms)
        ✓ resolves with poll data on success (Xms)
        ✓ rejects with error message on failure (Xms)
      submitVote
        ✓ emits submit-vote event with correct payload (Xms)
        ... [30+ more tests]
    connection event handlers
      ✓ connect event triggers connection status callbacks (Xms)
      ✓ connect event auto-rejoins with sessionStorage data (Xms)
      ... [10+ more tests]

Test Suites: 1 passed, 1 total
Tests:       35-40 passed, 35-40 total
Coverage:
  File                | % Stmts | % Branch | % Funcs | % Lines
  --------------------|---------|----------|---------|--------
  socketService.js    |   ≥80   |   ≥80    |   ≥80   |   ≥80
```

---

## Edge Cases to Cover

| Edge Case | Why Important | Test Coverage |
|-----------|---------------|---------------|
| Multiple listeners for same event | Common pattern in React components | Multiple callbacks in array |
| Removing non-existent callback | Prevents errors in cleanup | Filter returns empty array gracefully |
| Missing sessionStorage | Browser privacy modes disable storage | No auto-rejoin, no error thrown |
| Failed rejoin acknowledgment | Server may reject stale session | Handle `response.success === false` |
| Rapid connect/disconnect cycles | Network instability | Event handlers remain consistent |
| Callback invoked before listener registered | Race condition | Event handlers set up during initialization |

---

## Quality Gates

Before marking socketService tests as complete:

- [ ] All 35-40 test cases pass
- [ ] Statement coverage ≥80%
- [ ] Branch coverage ≥80%
- [ ] Function coverage ≥80%
- [ ] Line coverage ≥80%
- [ ] All exported functions tested
- [ ] All connection events tested
- [ ] sessionStorage interaction tested
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] No console.log or debug statements
- [ ] ESLint passes
- [ ] Prettier formatting applied
- [ ] Tests run in <5 seconds

---

## Integration with Existing Tests

**Existing tests that mock socketService**:
- `tests/contract/HostDashboard.test.js` - Mocks multiple socket functions
- These mocks remain valid and independent from unit tests

**Pattern consistency**:
- Follow the same mocking approach as `HostDashboard.test.js`
- Use `jest.mock()` for module-level mocking
- Use `jest.fn()` for function-level mocking

---

## Maintenance Notes

**When modifying socketService.js**:
1. Update corresponding test cases
2. Maintain ≥80% coverage across all metrics
3. Update this contract if event names or signatures change

**When adding new functions**:
1. Add test cases following the established pattern
2. Update coverage targets
3. Document new edge cases in this contract
