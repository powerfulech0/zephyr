# Feature Specification: Service Layer Unit Tests

**Feature Branch**: `006-service-layer-tests`
**Created**: 2025-11-10
**Status**: Draft
**Input**: User description: "Frontend: Add unit tests for service layer (apiService + socketService)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Service Test Coverage (Priority: P1)

As a developer maintaining the frontend codebase, I need comprehensive unit tests for `apiService.js` so that I can confidently refactor, enhance, or debug API communication logic without breaking existing functionality.

**Why this priority**: The API service is the primary interface between the frontend and backend REST API. Without tests, any changes risk breaking poll creation, retrieval, or health checks. This directly impacts all user-facing features.

**Independent Test**: Can be fully tested by running `npm test -- apiService.test.js` and verifying ≥80% coverage for `apiService.js`. Delivers immediate value by preventing regressions in API calls.

**Acceptance Scenarios**:

1. **Given** the test suite runs, **When** all API service tests execute, **Then** code coverage for `apiService.js` reaches ≥80% across all metrics (statements, branches, functions, lines)
2. **Given** a developer modifies `createPoll()` function, **When** tests run, **Then** any breaking changes are immediately detected and reported
3. **Given** network errors or API failures occur, **When** tests execute, **Then** error handling behavior is validated for all edge cases
4. **Given** the test suite passes, **When** reviewing test output, **Then** all test cases follow the Arrange-Act-Assert pattern and use proper mocks

---

### User Story 2 - Socket Service Test Coverage (Priority: P1)

As a developer maintaining real-time communication features, I need comprehensive unit tests for `socketService.js` so that I can ensure WebSocket event handling, reconnection logic, and listener management work correctly across all scenarios.

**Why this priority**: The socket service powers all real-time features (votes, participants, poll state). It has complex state management including reconnection logic and session persistence. Without tests, bugs can silently break real-time updates for users.

**Independent Test**: Can be fully tested by running `npm test -- socketService.test.js` and verifying ≥80% coverage for `socketService.js`. Delivers immediate value by validating event emission, listener registration, and reconnection behavior.

**Acceptance Scenarios**:

1. **Given** the test suite runs, **When** all socket service tests execute, **Then** code coverage for `socketService.js` reaches ≥80% across all metrics
2. **Given** a WebSocket connection is established, **When** tests validate event emission, **Then** all emitted events (`join-room`, `submit-vote`, `change-poll-state`) are verified with correct payloads
3. **Given** connection drops and reconnects, **When** tests execute, **Then** auto-rejoin logic and reconnection callbacks are validated
4. **Given** event listeners are registered, **When** tests execute, **Then** listener registration, callbacks, and cleanup (`off` methods) are verified

---

### Edge Cases

- What happens when `fetch()` throws a network error before receiving a response?
- How does the API service handle malformed JSON responses from the server?
- What happens when a WebSocket acknowledgment callback never fires (timeout scenario)?
- How does the socket service handle rapid connect/disconnect cycles?
- What happens when `sessionStorage` is unavailable or cleared during reconnection?
- How does the system behave when multiple listeners are registered for the same event?
- What happens when `socket.emit()` is called before the socket connects?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test suite MUST achieve ≥80% code coverage for `apiService.js` across all coverage metrics (statements, branches, functions, lines)
- **FR-002**: Test suite MUST achieve ≥80% code coverage for `socketService.js` across all coverage metrics
- **FR-003**: All tests MUST follow the established Arrange-Act-Assert pattern demonstrated in `tests/contract/HostDashboard.test.js`
- **FR-004**: Tests MUST properly mock external dependencies (`fetch`, `socket.io-client`) to ensure unit test isolation
- **FR-005**: Tests MUST validate successful API calls (`createPoll`, `getPoll`, `checkHealth`) with expected request parameters and response handling
- **FR-006**: Tests MUST validate error handling for network failures, HTTP error responses (400, 500), and malformed responses
- **FR-007**: Tests MUST validate WebSocket event emission (`join-room`, `submit-vote`, `change-poll-state`) with correct payloads and acknowledgment handling
- **FR-008**: Tests MUST validate event listener registration, callback execution, and cleanup for all socket events
- **FR-009**: Tests MUST validate reconnection logic including auto-rejoin behavior with session storage
- **FR-010**: Tests MUST validate connection status callbacks and reconnection attempt tracking
- **FR-011**: All tests MUST pass when executed via `npm test`
- **FR-012**: Running the test suite MUST show improved overall frontend coverage metrics

### Key Entities

- **API Service Test Suite**: Collection of unit tests validating HTTP request/response handling, error scenarios, and response parsing for `createPoll`, `getPoll`, and `checkHealth` functions
- **Socket Service Test Suite**: Collection of unit tests validating WebSocket event emission, listener management, reconnection logic, and connection status tracking
- **Mock Configuration**: Test doubles for `fetch` API and `socket.io-client` module to isolate unit tests from external dependencies
- **Coverage Report**: Test execution output showing percentage coverage for statements, branches, functions, and lines for each service file

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Code coverage for `apiService.js` increases from 0% to ≥80% for all coverage metrics
- **SC-002**: Code coverage for `socketService.js` increases from 0% to ≥80% for all coverage metrics
- **SC-003**: Overall frontend test coverage improves from 44.97% to a higher percentage (specific target depends on service file sizes)
- **SC-004**: All test cases pass with 100% success rate when running `npm test`
- **SC-005**: Developers can execute tests in under 10 seconds to enable rapid feedback during development
- **SC-006**: Test output clearly identifies which scenarios are tested and which assertions validate behavior
- **SC-007**: Future modifications to service layer code trigger test failures immediately when breaking changes are introduced
