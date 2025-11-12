# Feature Specification: Fix Poll Results TypeError on Host Dashboard

**Feature Branch**: `012-fix-poll-results-error`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "After voting, error message on host - Uncaught TypeError: counts is not iterable in PollResults.jsx:10"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Views Real-Time Vote Results (Priority: P1)

As a poll host, after participants submit votes, I should see real-time vote results displayed correctly on my dashboard without any errors or crashes.

**Why this priority**: This is the core functionality that enables hosts to monitor poll responses in real-time. Without this working, the host cannot fulfill their primary responsibility of viewing and managing poll results.

**Independent Test**: Create a poll, have a participant submit a vote, and verify the host dashboard displays vote counts and percentages without throwing any JavaScript errors.

**Acceptance Scenarios**:

1. **Given** a poll is created and in 'open' state, **When** the first participant submits a vote, **Then** the host dashboard displays vote counts (e.g., "1 vote (100%)") without any console errors
2. **Given** one vote has been submitted, **When** a second participant votes for a different option, **Then** the host dashboard updates to show both vote counts correctly (e.g., "1 vote (50%)" for each option)
3. **Given** multiple participants have voted, **When** a participant changes their vote, **Then** the host dashboard updates the vote counts in real-time without errors
4. **Given** a poll is in 'waiting' state with no votes, **When** the host views the dashboard, **Then** the results section displays "No results yet" or shows all options with 0 votes without throwing errors

---

### Edge Cases

- What happens when the poll transitions from 'waiting' to 'open' state and there are no votes yet?
- How does the system handle the initial render of the poll results before any vote-update events are received?
- What happens if the vote-update event contains unexpected data structures (missing fields, wrong data types)?
- How does the system handle the case where the number of votes/percentages doesn't match the number of options?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display poll results on the host dashboard without throwing JavaScript TypeErrors when participants submit votes
- **FR-002**: System MUST correctly interpret vote-update events from the backend, mapping the data structure to the expected component props
- **FR-003**: System MUST handle the initial state when no votes have been submitted yet (empty or zero-filled vote counts)
- **FR-004**: Host dashboard MUST display vote counts and percentages that accurately reflect the data received from vote-update events
- **FR-005**: System MUST maintain compatibility between the backend vote-update event payload structure and the frontend component expectations

### Key Entities

- **Vote Update Event**: Real-time event broadcast from backend containing vote data with fields: `votes` (array of counts), `percentages` (array of percentages), and `timestamp`
- **Poll Results State**: Frontend state object containing `counts` and `percentages` arrays that map to poll options

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Host dashboard displays vote results without any JavaScript errors in the browser console when participants vote
- **SC-002**: Vote counts and percentages update in real-time (within 1 second) when votes are submitted
- **SC-003**: All existing integration tests continue to pass without modification to test expectations
- **SC-004**: Host can view poll results from initial poll creation through multiple vote submissions without experiencing any UI crashes or error states
