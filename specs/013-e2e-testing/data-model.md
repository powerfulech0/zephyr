# Data Model: End-to-End Testing Infrastructure

**Feature**: 013-e2e-testing
**Date**: 2025-11-11
**Purpose**: Define test-specific data entities and structures used in E2E testing

## Overview

E2E tests do not introduce new application data entities. Instead, tests interact with existing application entities (Polls, Participants, Votes) and introduce test infrastructure entities for test execution, configuration, and reporting.

---

## Test Infrastructure Entities

### TestConfiguration

**Purpose**: Centralized test environment configuration

**Attributes**:
- `baseUrl` (string): Frontend application URL (e.g., "http://localhost:5173")
- `apiUrl` (string): Backend API URL (e.g., "http://localhost:4000")
- `wsUrl` (string): WebSocket URL (e.g., "ws://localhost:4000")
- `browserTimeout` (number): Default timeout for browser operations in ms (default: 30000)
- `wsTimeout` (number): Timeout for WebSocket events in ms (default: 2000)
- `retryAttempts` (number): Number of retry attempts for flaky tests (default: 2 in CI, 0 local)
- `parallel` (boolean): Enable parallel test execution (default: true in CI)
- `workers` (number): Number of parallel workers (default: 2 in CI, 1 local)
- `headless` (boolean): Run browsers in headless mode (default: true in CI, false local)
- `slowMo` (number): Slow down operations by N ms for debugging (default: 0)
- `recordVideo` (boolean): Record test execution videos (default: false)
- `screenshotOnFailure` (boolean): Capture screenshots on test failure (default: true)

**Relationships**: None (configuration entity)

**Validation Rules**:
- All URLs must be valid HTTP/WS URLs
- Timeouts must be positive integers
- Workers must be ≥1

**State Transitions**: N/A (static configuration)

**Source**: `tests/e2e/config/test-env.js`

---

### PageObject

**Purpose**: Abstraction of UI pages for maintainable test interactions

**Base Attributes** (BasePage):
- `page` (Playwright Page): Browser page instance
- `baseUrl` (string): Application base URL

**Common Methods**:
- `goto(path)`: Navigate to page
- `waitForLoad()`: Wait for page to fully load
- `getTitle()`: Get page title
- `screenshot(name)`: Capture screenshot

**Subclasses**:

#### HostDashboardPage

**Purpose**: Host dashboard interactions

**Key Methods**:
- `createPoll(question, options)`: Fill and submit poll creation form
- `getRoomCode()`: Extract displayed room code
- `openVoting()`: Click "Open Voting" button
- `closeVoting()`: Click "Close Voting" button
- `getResults()`: Extract vote counts and percentages
- `getParticipantCount()`: Get number of connected participants
- `getPollState()`: Get current poll state (waiting/open/closed)

#### JoinPage

**Purpose**: Participant join page interactions

**Key Methods**:
- `joinPoll(roomCode, nickname)`: Fill and submit join form
- `getErrorMessage()`: Extract displayed error message
- `isJoinSuccessful()`: Check if join was successful

#### VotePage

**Purpose**: Participant voting interactions

**Key Methods**:
- `getPollQuestion()`: Get displayed poll question
- `getOptions()`: Get list of available options
- `selectOption(optionText)`: Select an option
- `submitVote()`: Click submit button
- `getConfirmation()`: Get vote confirmation message
- `isVotingDisabled()`: Check if voting is disabled (poll closed)
- `getCurrentVote()`: Get currently selected option
- `changeVote(newOptionText)`: Change vote to different option

**Relationships**: None (test utilities)

**Source**: `tests/e2e/pages/*.js`

---

### TestData

**Purpose**: Generated test data for poll creation and participation

**Poll Test Data**:
```javascript
{
  question: string,      // e.g., "Test Poll 1699833600000"
  options: string[],     // e.g., ["Option A", "Option B", "Option C"]
  createdAt: number,     // Timestamp for uniqueness
  roomCode?: string      // Assigned after creation
}
```

**Participant Test Data**:
```javascript
{
  nickname: string,      // e.g., "Tester-a7k3m9"
  roomCode: string,      // Poll to join
  createdAt: number      // Timestamp for uniqueness
}
```

**Vote Test Data**:
```javascript
{
  participantNickname: string,  // Who voted
  selectedOption: string,       // Which option chosen
  timestamp: number             // When voted
}
```

**Generation Functions**:
- `generatePoll(overrides)`: Generate unique poll data
- `generateParticipant(overrides)`: Generate unique participant data
- `generateVote(options, overrides)`: Generate vote data

**Cleanup Tracking**:
```javascript
{
  createdPolls: string[],       // Room codes to clean up
  createdConnections: object[]  // WebSocket connections to close
}
```

**Relationships**: Generated data maps to application entities (Poll, Participant, Vote)

**Source**: `tests/e2e/fixtures/pollData.js`

---

### WebSocketEventCapture

**Purpose**: Capture and validate WebSocket events during tests

**Structure**:
```javascript
{
  events: [
    {
      type: string,        // Event type (e.g., "vote-update", "poll-state-changed")
      data: object,        // Event payload
      timestamp: number,   // When received
      source: string       // Connection identifier
    }
  ],
  connections: [
    {
      url: string,         // WebSocket URL
      state: string,       // open/closed
      framesSent: number,  // Number of frames sent
      framesReceived: number // Number of frames received
    }
  ]
}
```

**Key Methods** (helper functions):
- `captureSocketEvents(page, eventTypes)`: Start capturing specific event types
- `waitForSocketEvent(page, eventType, timeout)`: Wait for specific event
- `getSocketEvents(page, eventType)`: Retrieve captured events by type
- `clearSocketEvents(page)`: Clear captured events
- `assertEventReceived(page, eventType, expectedData)`: Assert event was received with data

**Relationships**: Observes WebSocket communication for application entities

**Source**: `tests/e2e/helpers/websocketHelpers.js`

---

### TestReport

**Purpose**: Test execution results and artifacts

**Structure**:
```javascript
{
  testName: string,           // Test description
  status: string,             // passed/failed/skipped
  duration: number,           // Execution time in ms
  retries: number,            // Number of retry attempts
  errors: [
    {
      message: string,        // Error message
      stack: string,          // Stack trace
      screenshot?: string     // Path to failure screenshot
    }
  ],
  artifacts: {
    screenshots: string[],    // Paths to screenshots
    videos?: string[],        // Paths to videos (if enabled)
    traces?: string[]         // Paths to trace files (if enabled)
  },
  browser: string,            // chromium/firefox/webkit
  timestamp: number           // Test execution timestamp
}
```

**Aggregated Suite Results**:
```javascript
{
  totalTests: number,
  passed: number,
  failed: number,
  skipped: number,
  duration: number,
  flakiness: number,          // Percentage of tests that needed retries
  reports: TestReport[]
}
```

**Relationships**: None (reporting entity)

**Generated By**: Playwright Test Runner

**Output Location**: `tests/e2e/reports/`

---

## Application Entities (Test Interactions)

E2E tests interact with existing application entities but do not modify their structure:

### Poll (Application Entity)

**E2E Test Interactions**:
- **Created by**: HostDashboardPage.createPoll()
- **Validated**: Room code uniqueness, state transitions, data persistence
- **Cleanup**: Tracked in TestData.createdPolls, deleted after test

### Participant (Application Entity)

**E2E Test Interactions**:
- **Created by**: JoinPage.joinPoll()
- **Validated**: Nickname uniqueness within poll, connection tracking, join/leave events
- **Cleanup**: Connections closed after test, tracked in TestData.createdConnections

### Vote (Application Entity)

**E2E Test Interactions**:
- **Created by**: VotePage.submitVote()
- **Validated**: Vote recording, vote updates, real-time synchronization, vote changes
- **Cleanup**: Cascade deleted when poll is cleaned up

---

## Data Flow Diagrams

### Host Poll Lifecycle Test Flow

```
Test Start
    ↓
Generate TestData.poll
    ↓
HostDashboardPage.createPoll(poll) → Backend creates Poll entity
    ↓
HostDashboardPage.getRoomCode() → Extract room code
    ↓
Track in TestData.createdPolls (for cleanup)
    ↓
HostDashboardPage.openVoting() → Poll state: waiting → open
    ↓
Capture WebSocketEventCapture (poll-state-changed event)
    ↓
Assert event received by all clients
    ↓
HostDashboardPage.closeVoting() → Poll state: open → closed
    ↓
Assert final results match expected counts
    ↓
Cleanup: Delete poll via TestData.createdPolls
    ↓
Test End
```

### Participant Vote Journey Test Flow

```
Test Start
    ↓
Generate TestData.poll (via host page object)
    ↓
Generate TestData.participant
    ↓
JoinPage.joinPoll(roomCode, nickname) → Backend creates Participant entity
    ↓
Track connection in TestData.createdConnections
    ↓
VotePage.selectOption(option) + submitVote() → Backend creates Vote entity
    ↓
Capture WebSocketEventCapture (vote-update event)
    ↓
Assert VotePage.getConfirmation() shows success
    ↓
Assert vote-update event received with correct data
    ↓
VotePage.changeVote(newOption) → Backend updates Vote entity
    ↓
Assert vote-update event reflects new vote
    ↓
Cleanup: Close connection, delete poll
    ↓
Test End
```

### Multi-User Concurrent Test Flow

```
Test Start
    ↓
Generate TestData.poll (via host page object)
    ↓
Generate 10 × TestData.participant
    ↓
Open 10 browser contexts (parallel)
    ↓
JoinPage.joinPoll() × 10 (concurrent) → 10 Participant entities created
    ↓
Assert HostDashboardPage.getParticipantCount() === 10
    ↓
VotePage.submitVote() × 10 (concurrent) → 10 Vote entities created
    ↓
Capture WebSocketEventCapture (vote-update events) across all contexts
    ↓
Assert all 10 contexts received vote-update within 2 seconds
    ↓
Assert vote counts match expected distribution
    ↓
Close 1 browser context
    ↓
Assert HostDashboardPage.getParticipantCount() === 9 (within 1 second)
    ↓
Cleanup: Close all connections, delete poll
    ↓
Test End
```

---

## Validation Rules

### Test Data Validation

1. **Poll Data**:
   - Question must not be empty
   - Options array must contain 2-5 strings
   - Each option must be unique within poll
   - Generated questions include timestamp for uniqueness

2. **Participant Data**:
   - Nickname must be 1-50 characters
   - Nickname must be unique within poll (validated by JoinPage.getErrorMessage())
   - Room code must be 6 characters

3. **Vote Data**:
   - Selected option must exist in poll options
   - One vote per participant (or vote update)

### Test Execution Validation

1. **Timeouts**:
   - Browser operations: max 30 seconds
   - WebSocket events: max 2 seconds
   - Page loads: max 10 seconds

2. **Assertions**:
   - All assertions must have descriptive error messages
   - WebSocket event assertions must specify expected payload structure
   - UI element assertions must use auto-wait (no fixed sleeps)

3. **Cleanup**:
   - All created polls must be tracked and deleted
   - All WebSocket connections must be closed
   - No orphaned test data after test completion

---

## State Transitions (Test Execution)

### Test Lifecycle States

```
pending → running → (passed | failed | skipped)
                        ↓           ↓
                   (if flaky) → retrying → (passed | failed)
```

### Browser Context States

```
created → navigated → interacting → asserting → closing → closed
```

### WebSocket Connection States (Monitored)

```
connecting → open → active → (closing | disconnected) → closed
```

---

## Summary

E2E test data model focuses on test infrastructure entities (configuration, page objects, test data generators, event capture, reporting) rather than new application entities. Tests interact with existing application entities (Poll, Participant, Vote) to validate end-to-end workflows. Key principles:

1. **Test Isolation**: Each test generates unique data with timestamps/random suffixes
2. **Automatic Cleanup**: Track created resources and clean up after test execution
3. **Page Object Abstraction**: UI interactions abstracted into maintainable page classes
4. **WebSocket Validation**: Event capture pattern for reliable real-time testing
5. **Comprehensive Reporting**: Screenshots, videos, traces for debugging failures
