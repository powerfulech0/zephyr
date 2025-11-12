# Implementation Plan: Fix Vote Submission

**Branch**: `011-fix-vote-submission` | **Date**: 2025-11-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-fix-vote-submission/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix vote submission bug preventing participants from casting votes in the frontend VotePage component. This is a critical bug affecting core voting functionality. The fix will ensure participants can reliably submit and change votes when the poll is open, with proper error handling and visual feedback.

## Technical Context

**Language/Version**: JavaScript ES6+ (frontend), React 19.2.0
**Primary Dependencies**: React 19.2.0, react-dom 19.2.0, Socket.io-client 4.x, Vite 7.2.2
**Storage**: N/A (bug fix only, no storage changes)
**Testing**: Jest 30.x, @testing-library/react, @testing-library/jest-dom
**Target Platform**: Browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Vote submission < 500ms, visual feedback < 1s
**Constraints**: Must maintain compatibility with existing backend socket events
**Scale/Scope**: Frontend-only bug fix affecting VotePage.jsx and related components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

### MVP Principles (v1.0.0)

**I. Real-time First** ✅
- Does this feature require real-time state synchronization? **Yes** - Vote submission uses WebSocket
- If yes, are WebSocket events planned for all state changes? **Yes** - submit-vote event existing, no changes needed
- Are connection/disconnection events tracked? **Yes** - Already implemented (T090, T091, T092)

**II. Simplicity & Production Readiness** ✅
- Is the simplest viable solution proposed? **Yes** - Bug fix to existing code
- Are all external dependencies necessary and justified? **Yes** - All dependencies already in use
- Are there any architectural patterns (repositories, ORMs) being introduced? **No**
- Is production infrastructure (databases, caching, monitoring) justified against specific requirements? **N/A** - No infrastructure changes

**III. Component Isolation** ✅
- Are Host and Participant responsibilities clearly separated? **Yes** - Bug fix maintains existing separation
- Does this feature maintain role-based permission boundaries? **Yes** - No changes to permissions
- Are room isolation requirements satisfied? **Yes** - No changes to room isolation

**IV. Test-Driven Development** ✅
- Are acceptance scenarios defined in Given-When-Then format in spec.md? **Yes**
- Are integration tests planned for WebSocket flows? **Yes** - Contract tests for vote submission
- Are contract tests planned for APIs? **Yes** - VotePage contract tests
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md? **Will be in tasks.md**

**V. Code Quality Standards** ✅
- Are linting and formatting tools configured (ESLint, Prettier)? **Yes** - Already configured
- Is TypeScript strict mode enabled (if applicable)? **N/A** - JavaScript project
- Are pre-commit hooks configured for quality gates? **Yes** - lint-staged configured
- Are security vulnerability scans configured? **Yes** - npm audit available

**VI. Incremental Delivery** ✅
- Are user stories prioritized (P1, P2, P3) in spec.md? **Yes**
- Is each story independently testable? **Yes**
- Are P1 stories planned for completion before P2 stories? **Yes**

### Production Principles (v2.0.0)

**VII. Data Persistence & Reliability** N/A
- Is data persistence required for this feature? **No** - Frontend bug fix only
- Vote persistence handled by existing backend

**VIII. Security First** ✅
- Are all user inputs sanitized and validated? **Yes** - Backend already validates
- Is rate limiting planned to prevent abuse? **Yes** - Backend already has rate limiting
- Are CORS policies configured? **Yes** - Backend already configured
- Are security headers planned (CSP, X-Frame-Options, HSTS)? **Yes** - Backend already configured
- Are security events logged? **Yes** - Backend already logs
- Are secrets externalized (not hardcoded)? **Yes** - Already using env vars

**IX. Observability & Monitoring** N/A
- This is a frontend bug fix; backend monitoring already exists

**X. Deployment Excellence** N/A
- No deployment changes needed for this bug fix

**XI. Scalability & Performance** N/A
- No scalability changes needed; bug fix maintains existing performance

**XII. Resilience & Error Handling** ✅
- Is retry logic with exponential backoff planned for transient failures? **No** - User-initiated retry (click again)
- Are circuit breakers planned for external dependencies? **N/A** - Frontend component
- Are timeout limits defined for all external operations? **Yes** - Socket.io has built-in timeouts
- Is graceful degradation planned for non-critical features? **Yes** - Error messages shown
- Are user-friendly error messages planned (no stack traces)? **Yes** - Specified in requirements
- Is automatic WebSocket reconnection planned? **Yes** - Already implemented (T090)

**Overall Status**: ✅ PASS

*No violations requiring justification.*

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-vote-submission/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (root cause analysis)
├── data-model.md        # Phase 1 output (state model)
├── quickstart.md        # Phase 1 output (reproduction steps)
├── contracts/           # Phase 1 output (test contracts)
│   └── vote-submission-contract.md
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── VoteConfirmation.jsx      # Confirmation component
│   ├── pages/
│   │   └── VotePage.jsx               # Main vote page (bug location)
│   └── services/
│       └── socketService.js           # Socket.io service (vote submission)
└── tests/
    ├── contract/
    │   └── VotePage.test.js           # Vote page contract tests
    └── unit/
        └── socketService.test.js       # Socket service unit tests

backend/
├── src/
│   └── sockets/
│       └── events/
│           └── submitVote.js          # Backend vote handler
└── tests/
    └── contract/
        └── submitVote.test.js         # Backend contract tests
```

**Structure Decision**: Web application structure with frontend/backend separation. Bug fix primarily affects frontend VotePage.jsx component and may require investigation of backend submitVote handler if issue is server-side.

## Complexity Tracking

No constitution violations to justify. This is a straightforward bug fix using existing architecture and dependencies.

## Phase 0: Research & Root Cause Analysis

### Research Questions

1. **What is preventing vote submission?**
   - Investigate error conditions in VotePage.jsx handleVoteSubmit function
   - Check socket connection status when vote attempts fail
   - Review browser console errors and network activity
   - Examine backend submitVote handler for validation failures

2. **When does the bug occur?**
   - Test vote submission in different poll states (waiting, open, closed)
   - Test with different connection states (connected, reconnecting, disconnected)
   - Test with valid vs invalid session data
   - Test rapid clicking and concurrent operations

3. **What is the expected behavior?**
   - Document successful vote submission flow from frontend to backend
   - Identify all validation points and error handling paths
   - Map WebSocket event flow (submit-vote request → acknowledgment → vote-update broadcast)

### Research Deliverables

- **research.md**: Root cause analysis, reproduction steps, technical findings
- Decision on whether fix is frontend-only, backend-only, or both
- Identification of missing error handling or validation logic
- Assessment of test coverage gaps

## Phase 1: Design & Contracts

### Data Model (state model)

**VotePage Component State**:
- poll: object | null (poll data from sessionStorage)
- nickname: string (participant nickname)
- roomCode: string (6-character room code)
- selectedOption: number | null (index of selected option)
- hasVoted: boolean (vote submission status)
- pollState: 'waiting' | 'open' | 'closed'
- voteResults: { votes: number[], percentages: number[] }
- error: string | null (error message)
- loading: boolean (submission in progress)
- showConfirmation: boolean (show success feedback)
- isReconnecting: boolean (reconnection in progress)
- connectionStatus: 'connected' | 'disconnected' | 'failed'

**Vote Submission Flow**:
1. User clicks option → handleVoteSubmit(optionIndex)
2. Validate: loading === false && pollState === 'open'
3. Set loading = true, error = null
4. Call submitVote(roomCode, nickname, optionIndex) via socketService
5. On success: setSelectedOption, setHasVoted, setShowConfirmation
6. On error: setError with message
7. Finally: setLoading = false

**Error Conditions**:
- Invalid session data (roomCode, nickname missing)
- Poll state not 'open'
- Connection not 'connected'
- Socket timeout or rejection
- Backend validation failure

### API Contracts

**Socket Event: submit-vote** (Client → Server)

```javascript
// Request
socket.emit('submit-vote', {
  roomCode: string,      // 6-character room code
  nickname: string,      // Participant nickname
  optionIndex: number    // 0-based option index
}, callback)

// Response (acknowledgment callback)
{
  success: boolean,
  error?: string         // Present if success = false
}

// Broadcast to room (if successful)
Event: 'vote-update'
Payload: {
  votes: number[],       // Vote counts per option
  percentages: number[]  // Percentages per option
}
```

**Contract Test Scenarios**:
1. Valid vote submission → success: true, vote-update broadcast
2. Invalid roomCode → success: false, error: "Room not found"
3. Poll not open → success: false, error: "Poll is not open"
4. Invalid optionIndex → success: false, error: "Invalid option"
5. Missing nickname → success: false, error: "Nickname required"

### Quickstart (Bug Reproduction)

**Reproduction Steps**:
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run start`
3. Create a poll in HostDashboard
4. Open poll URL in new browser tab
5. Join as participant with nickname
6. Wait for host to open voting
7. Click on any poll option
8. Observe: Expected = "Vote recorded!" confirmation, Actual = [BUG BEHAVIOR]

**Expected Behavior**:
- Vote submission completes within 500ms
- "Vote recorded!" confirmation appears
- Vote count and percentage update
- Can click different option to change vote

**Actual Behavior**:
- [TO BE DOCUMENTED IN RESEARCH PHASE]

### Contracts Directory

```text
contracts/
└── vote-submission-contract.md
```

**vote-submission-contract.md**:
- Submit vote when poll open and connected → Success
- Submit vote when poll waiting → Error: "Voting not started"
- Submit vote when poll closed → Error: "Voting closed"
- Submit vote when disconnected → Error: "Connection lost"
- Change vote when already voted → Success (vote updated)
- Submit invalid option index → Error: "Invalid option"

## Phase 2: Task Planning

Task planning will be handled by `/speckit.tasks` command. Expected task organization:

**User Story 1 (P1): Participant Vote Submission**
- Write failing tests for vote submission flow
- Investigate and fix root cause preventing submission
- Implement vote submission logic
- Implement vote change logic
- Verify real-time update handling

**User Story 2 (P2): Vote State Feedback**
- Write failing tests for UI state transitions
- Fix loading state handling
- Fix confirmation display
- Verify disabled state logic

**User Story 3 (P2): Error Handling**
- Write failing tests for error scenarios
- Fix error message display
- Fix retry capability
- Verify error recovery

## Success Metrics

- All contract tests pass (vote submission, error handling)
- All integration tests pass (VotePage component)
- Vote submission success rate 99%+ in local testing
- No regressions in existing voting functionality
- Code coverage maintained at ≥90%

## Dependencies

**Upstream**:
- Backend submitVote handler must be functional
- Socket.io connection must be established
- sessionStorage must contain valid poll data

**Downstream**:
- No downstream dependencies (bug fix)

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bug is backend-side | Medium | Medium | Research phase will identify location; backend fix requires different approach |
| Session management issue | Low | High | Verify sessionStorage handling in joinRoom flow |
| Race condition in state updates | Low | Medium | Add unit tests for concurrent operations |
| Socket timeout not handled | Medium | Low | Verify timeout handling in socketService |

## Rollout Plan

1. **Development**: Fix bug on 011-fix-vote-submission branch
2. **Testing**: Run full test suite (unit, contract, integration)
3. **Manual Testing**: Reproduce bug and verify fix in local environment
4. **PR Review**: Create pull request with reproduction steps and test evidence
5. **Merge**: Merge to main after approval
6. **Deploy**: Deploy frontend to production

## Notes

- This is a **critical bug** affecting core voting functionality
- Must maintain backward compatibility with existing backend
- No breaking changes to socket event contracts
- Priority is correctness and reliability over additional features
