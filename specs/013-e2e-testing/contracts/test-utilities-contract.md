# Contract: Test Utilities

**Feature**: 013-e2e-testing
**Date**: 2025-11-11
**Purpose**: Define interfaces for test utility functions and fixtures

## Overview

Test utilities provide reusable functions for test data generation, WebSocket event capture, cleanup, and common test operations.

---

## Test Data Generators

**Path**: `tests/e2e/fixtures/pollData.js`

### generatePoll(overrides)

Generate unique test poll data.

```javascript
function generatePoll(overrides = {})
```

**Parameters**:
- `overrides` (object): Optional properties to override defaults
  - `question` (string): Custom question
  - `options` (string[]): Custom options

**Returns**: `PollData`

```javascript
type PollData = {
  question: string,      // e.g., "Test Poll 1699833600000"
  options: string[],     // e.g., ["Option A", "Option B", "Option C"]
  createdAt: number      // Timestamp for uniqueness
}
```

**Behavior**:
- Generates unique question with timestamp if not provided
- Generates 3 default options if not provided
- Ensures timestamp uniqueness

**Example**:
```javascript
const poll = generatePoll();
// { question: "Test Poll 1699833600000", options: ["Option A", "Option B", "Option C"], createdAt: 1699833600000 }

const customPoll = generatePoll({ question: "Favorite color?", options: ["Red", "Blue"] });
// { question: "Favorite color?", options: ["Red", "Blue"], createdAt: 1699833600123 }
```

---

### generateParticipant(overrides)

Generate unique test participant data.

```javascript
function generateParticipant(overrides = {})
```

**Parameters**:
- `overrides` (object): Optional properties to override
  - `nickname` (string): Custom nickname
  - `roomCode` (string): Poll room code

**Returns**: `ParticipantData`

```javascript
type ParticipantData = {
  nickname: string,      // e.g., "Tester-a7k3m9"
  roomCode?: string,     // Optional room code
  createdAt: number      // Timestamp
}
```

**Behavior**:
- Generates random 6-character suffix for nickname uniqueness
- Uses alphanumeric characters (no special chars)

**Example**:
```javascript
const participant = generateParticipant();
// { nickname: "Tester-a7k3m9", createdAt: 1699833600000 }

const customParticipant = generateParticipant({ nickname: "Alice", roomCode: "ABC123" });
// { nickname: "Alice", roomCode: "ABC123", createdAt: 1699833600123 }
```

---

### generateVote(options, overrides)

Generate test vote data.

```javascript
function generateVote(options, overrides = {})
```

**Parameters**:
- `options` (string[]): Available poll options
- `overrides` (object): Optional properties
  - `selectedOption` (string): Specific option to select
  - `participantNickname` (string): Voter nickname

**Returns**: `VoteData`

```javascript
type VoteData = {
  selectedOption: string,       // Option text
  participantNickname?: string, // Who voted
  timestamp: number             // When voted
}
```

**Behavior**:
- Randomly selects from available options if not specified
- Validates selected option exists in options array

**Example**:
```javascript
const vote = generateVote(["Red", "Blue", "Green"]);
// { selectedOption: "Blue", timestamp: 1699833600000 }

const customVote = generateVote(["Red", "Blue"], { selectedOption: "Red", participantNickname: "Alice" });
// { selectedOption: "Red", participantNickname: "Alice", timestamp: 1699833600123 }
```

---

## WebSocket Helpers

**Path**: `tests/e2e/helpers/websocketHelpers.js`

### captureSocketEvents(page, eventTypes)

Start capturing WebSocket events of specific types.

```javascript
async function captureSocketEvents(page, eventTypes = [])
```

**Parameters**:
- `page` (Playwright Page): Browser page instance
- `eventTypes` (string[]): Array of Socket.io event types to capture (empty = capture all)

**Returns**: `Promise<void>`

**Side Effects**:
- Injects event listener into page context
- Stores captured events in `window.socketEvents` array

**Example**:
```javascript
await captureSocketEvents(page, ['vote-update', 'poll-state-changed']);
```

---

### waitForSocketEvent(page, eventType, options)

Wait for specific WebSocket event to be received.

```javascript
async function waitForSocketEvent(page, eventType, options = {})
```

**Parameters**:
- `page` (Playwright Page): Browser page instance
- `eventType` (string): Socket.io event type to wait for
- `options` (object):
  - `timeout` (number): Max wait time in ms (default: 2000)
  - `dataMatch` (object): Optional partial data to match

**Returns**: `Promise<SocketEvent>`

```javascript
type SocketEvent = {
  type: string,
  data: any,
  timestamp: number
}
```

**Throws**: `TimeoutError` if event not received within timeout

**Example**:
```javascript
// Wait for any vote-update event
const event = await waitForSocketEvent(page, 'vote-update');

// Wait for vote-update with specific data
const event = await waitForSocketEvent(page, 'vote-update', {
  timeout: 3000,
  dataMatch: { votes: { "Red": 5 } }
});
```

---

### getSocketEvents(page, eventType)

Retrieve all captured events of specific type.

```javascript
async function getSocketEvents(page, eventType = null)
```

**Parameters**:
- `page` (Playwright Page): Browser page instance
- `eventType` (string | null): Filter by event type (null = return all)

**Returns**: `Promise<SocketEvent[]>`

**Example**:
```javascript
const allEvents = await getSocketEvents(page);
const voteEvents = await getSocketEvents(page, 'vote-update');
```

---

### clearSocketEvents(page)

Clear all captured events.

```javascript
async function clearSocketEvents(page)
```

**Parameters**:
- `page` (Playwright Page): Browser page instance

**Returns**: `Promise<void>`

**Example**:
```javascript
await clearSocketEvents(page);
```

---

### assertEventReceived(page, eventType, expectedData)

Assert that event was received with expected data.

```javascript
async function assertEventReceived(page, eventType, expectedData = null)
```

**Parameters**:
- `page` (Playwright Page): Browser page instance
- `eventType` (string): Event type to check
- `expectedData` (object | null): Expected event data (partial match)

**Returns**: `Promise<void>`

**Throws**: `AssertionError` if event not found or data doesn't match

**Example**:
```javascript
// Assert event received (any data)
await assertEventReceived(page, 'poll-state-changed');

// Assert event with specific data
await assertEventReceived(page, 'vote-update', { votes: { "Red": 5 } });
```

---

## Test Fixtures

**Path**: `tests/e2e/fixtures/testUtils.js`

### pollCleanup Fixture

Automatically track and clean up created polls.

```javascript
export const test = base.extend({
  pollCleanup: async ({}, use) => {
    const tracker = new CleanupTracker();
    await use(tracker);
    await tracker.cleanup();
  }
});
```

**Usage in Tests**:
```javascript
test('create poll', async ({ page, pollCleanup }) => {
  const hostPage = new HostDashboardPage(page, baseUrl);
  await hostPage.createPoll('Question?', ['A', 'B']);
  const roomCode = await hostPage.getRoomCode();

  // Track for cleanup
  pollCleanup.trackPoll(roomCode);

  // Test continues...
  // Cleanup happens automatically after test
});
```

**CleanupTracker Methods**:

#### trackPoll(roomCode)

Track poll for cleanup.

```javascript
trackPoll(roomCode)
```

**Parameters**:
- `roomCode` (string): Room code to clean up

**Returns**: `void`

---

#### trackConnection(page)

Track WebSocket connection for cleanup.

```javascript
trackConnection(page)
```

**Parameters**:
- `page` (Playwright Page): Page with WebSocket connection

**Returns**: `void`

---

#### cleanup()

Clean up all tracked resources.

```javascript
async cleanup()
```

**Returns**: `Promise<void>`

**Behavior**:
- Closes all tracked WebSocket connections
- Deletes all tracked polls (via API or direct DB)
- Runs automatically after each test

---

## Browser Helpers

**Path**: `tests/e2e/helpers/browserHelpers.js`

### waitForNetworkIdle(page, options)

Wait for network to become idle.

```javascript
async function waitForNetworkIdle(page, options = {})
```

**Parameters**:
- `page` (Playwright Page): Browser page
- `options` (object):
  - `timeout` (number): Max wait time in ms (default: 30000)
  - `idleTime` (number): Idle duration to consider stable in ms (default: 500)

**Returns**: `Promise<void>`

**Example**:
```javascript
await waitForNetworkIdle(page, { idleTime: 1000 });
```

---

### retryOperation(operation, options)

Retry an operation with exponential backoff.

```javascript
async function retryOperation(operation, options = {})
```

**Parameters**:
- `operation` (Function): Async function to retry
- `options` (object):
  - `maxRetries` (number): Max retry attempts (default: 3)
  - `delay` (number): Initial delay in ms (default: 1000)
  - `backoff` (number): Backoff multiplier (default: 2)

**Returns**: `Promise<any>` - Result of successful operation

**Throws**: Last error if all retries fail

**Example**:
```javascript
const result = await retryOperation(
  async () => await flakeyFunction(),
  { maxRetries: 3, delay: 500 }
);
```

---

### createMultipleContexts(browser, count)

Create multiple isolated browser contexts.

```javascript
async function createMultipleContexts(browser, count)
```

**Parameters**:
- `browser` (Playwright Browser): Browser instance
- `count` (number): Number of contexts to create

**Returns**: `Promise<BrowserContext[]>`

**Example**:
```javascript
const contexts = await createMultipleContexts(browser, 10);
// Use for multi-user tests
```

---

## Configuration Helpers

**Path**: `tests/e2e/config/test-env.js`

### getConfig()

Get test environment configuration.

```javascript
function getConfig()
```

**Returns**: `TestConfig`

```javascript
type TestConfig = {
  baseUrl: string,
  apiUrl: string,
  wsUrl: string,
  browserTimeout: number,
  wsTimeout: number,
  retryAttempts: number,
  parallel: boolean,
  workers: number,
  headless: boolean,
  slowMo: number,
  recordVideo: boolean,
  screenshotOnFailure: boolean
}
```

**Behavior**:
- Loads from environment variables with fallback defaults
- `CI=true` enables retries, parallel, headless
- Local development uses headless=false for debugging

**Example**:
```javascript
const config = getConfig();
console.log(config.baseUrl); // "http://localhost:5173"
```

---

### setConfig(overrides)

Override configuration for specific test.

```javascript
function setConfig(overrides)
```

**Parameters**:
- `overrides` (Partial<TestConfig>): Properties to override

**Returns**: `void`

**Example**:
```javascript
setConfig({ browserTimeout: 60000 });
```

---

## Implementation Requirements

### All Utility Functions MUST:

1. **Pure Functions**: No side effects unless explicitly documented
2. **Error Handling**: Descriptive errors with context
3. **Type Safety**: JSDoc comments for parameters and return types
4. **Idempotent**: Safe to call multiple times where applicable
5. **Tested**: Unit tests for all utility functions

### Naming Conventions:

- **Functions**: Verb-based (`generatePoll`, `waitForSocketEvent`, `trackPoll`)
- **Boolean Functions**: Prefix with `is` or `has` (`isEventReceived`, `hasConnection`)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-11 | Initial contract definition |
