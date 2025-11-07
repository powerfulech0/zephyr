# Tasks: Voting App MVP

**Input**: Design documents from `/specs/001-voting-app-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Tasks follow the structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create backend directory structure (models, services, api, sockets, config, tests)
- [X] T002 Create frontend directory structure (pages, components, services, utils, tests)
- [X] T003 Create shared directory for event type constants
- [X] T004 Initialize backend package.json with dependencies (express, socket.io, nanoid, pino, pino-http, cors)
- [X] T005 [P] Install backend dev dependencies (jest, supertest, socket.io-client, eslint, eslint-config-airbnb-base, eslint-plugin-import, eslint-plugin-jest, eslint-config-prettier, prettier, husky, lint-staged, nodemon)
- [X] T006 [P] Configure backend ESLint with Airbnb style guide in backend/.eslintrc.js
- [X] T007 [P] Configure backend Prettier in backend/.prettierrc
- [X] T008 [P] Configure Jest for backend in backend/jest.config.js
- [X] T009 [P] Setup Husky pre-commit hooks in backend/.husky/pre-commit
- [X] T010 [P] Configure lint-staged in backend/package.json
- [X] T011 [P] Add npm scripts (start, test, test:watch, lint, format) to backend/package.json
- [X] T012 Initialize frontend with Create React App or manual setup
- [X] T013 [P] Install frontend dependencies (react, react-dom, react-router-dom, socket.io-client, chart.js or recharts)
- [X] T014 [P] Install frontend dev dependencies (@testing-library/react, @testing-library/jest-dom, eslint-config-airbnb, eslint-plugin-react, eslint-plugin-react-hooks, prettier)
- [X] T015 [P] Configure frontend ESLint with React plugins in frontend/.eslintrc.js
- [X] T016 [P] Configure frontend Prettier in frontend/.prettierrc
- [X] T017 Create backend/.env with PORT, NODE_ENV, LOG_LEVEL, FRONTEND_URL
- [X] T018 Create frontend/.env with REACT_APP_API_URL

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T019 Create pino logger configuration in backend/src/config/logger.js with pino-pretty for development
- [X] T020 Create environment config loader in backend/src/config/index.js
- [X] T021 [P] Create Socket.io event name constants in shared/eventTypes.js (join-room, submit-vote, change-poll-state, participant-joined, participant-left, vote-update, poll-state-changed)
- [X] T022 [P] Create room code generator service in backend/src/services/roomCodeGenerator.js using nanoid with custom alphabet
- [X] T023 [P] Create PollManager class in backend/src/models/PollManager.js with Map-based storage
- [X] T024 Create centralized error handler middleware in backend/src/api/middleware/errorHandler.js with pino logging
- [X] T025 [P] Create request validator middleware in backend/src/api/middleware/validator.js for question, options, room codes
- [X] T026 Create Express server initialization in backend/src/server.js with pino-http, CORS, and Socket.io integration
- [X] T027 Create health check route in backend/src/api/routes/healthRoutes.js (GET /api/health)
- [X] T028 Create main Socket.io connection handler in backend/src/sockets/socketHandler.js
- [X] T029 [P] Create socketService for frontend in frontend/src/services/socketService.js with auto-reconnection config
- [X] T030 [P] Create apiService for HTTP requests in frontend/src/services/apiService.js
- [X] T031 Create React routing structure in frontend/src/App.js with routes for host, join, vote pages

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Host Creates and Controls Poll (Priority: P1) 🎯 MVP

**Goal**: Enable hosts to create polls with question and options, receive room code, control poll state (open/close voting), and view live results

**Independent Test**: Host can create a poll, receive room code, open voting, view simulated results, and close voting independently

### Tests for User Story 1 (TDD Required by Constitution)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T032 [P] [US1] Unit test for PollManager.createPoll() in backend/tests/unit/PollManager.test.js (test unique room code generation)
- [ ] T033 [P] [US1] Unit test for PollManager.changePollState() in backend/tests/unit/PollManager.test.js (test host validation, state transitions)
- [ ] T034 [P] [US1] Unit test for roomCodeGenerator in backend/tests/unit/roomCodeGenerator.test.js (test format, collision resistance)
- [ ] T035 [P] [US1] Contract test for POST /api/polls in backend/tests/contract/pollApi.test.js (test validation, success response)
- [ ] T036 [P] [US1] Contract test for GET /api/polls/:roomCode in backend/tests/contract/pollApi.test.js (test 200 and 404 responses)
- [ ] T037 [P] [US1] Contract test for change-poll-state Socket.io event in backend/tests/contract/websocket.test.js (test host-only validation)
- [ ] T038 [US1] Integration test for host poll lifecycle in backend/tests/integration/hostFlow.test.js (create → open → close flow)

### Implementation for User Story 1

- [ ] T039 [P] [US1] Implement PollManager.createPoll() method with unique room code generation
- [ ] T040 [P] [US1] Implement PollManager.getPoll() method for room code lookup
- [ ] T041 [P] [US1] Implement PollManager.changePollState() method with host socket ID validation
- [ ] T042 [US1] Implement POST /api/polls route in backend/src/api/routes/pollRoutes.js (create poll, return room code)
- [ ] T043 [US1] Implement GET /api/polls/:roomCode route in backend/src/api/routes/pollRoutes.js (poll validation)
- [ ] T044 [US1] Implement change-poll-state Socket.io event handler in backend/src/sockets/events/changePollState.js
- [ ] T045 [US1] Implement broadcastStateChange emitter in backend/src/sockets/emitters/broadcastStateChange.js (poll-state-changed event)
- [ ] T046 [P] [US1] Create HostDashboard component in frontend/src/pages/HostDashboard.js with poll creation form
- [ ] T047 [P] [US1] Create PollControls component in frontend/src/components/PollControls.js (Open/Close voting buttons)
- [ ] T048 [P] [US1] Create PollResults component in frontend/src/components/PollResults.js (bar chart/percentages display)
- [ ] T049 [P] [US1] Create ParticipantCounter component in frontend/src/components/ParticipantCounter.js (live participant count)
- [ ] T050 [US1] Connect HostDashboard to apiService (poll creation) and socketService (state changes, results updates)
- [ ] T051 [US1] Add Socket.io event listeners in HostDashboard for vote-update, participant-joined, participant-left, poll-state-changed
- [ ] T052 [US1] Add validation and error handling for poll creation (question length, option count)
- [ ] T053 [US1] Add logging for poll creation, state changes, and host actions

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Participant Joins and Votes (Priority: P2)

**Goal**: Enable participants to join polls with room code and nickname, view question/options, submit votes, receive instant confirmation, and change votes

**Independent Test**: Participant can join an existing poll (from US1), submit a vote, receive confirmation, and change vote while voting is open

### Tests for User Story 2 (TDD Required by Constitution)

- [ ] T054 [P] [US2] Unit test for PollManager.addParticipant() in backend/tests/unit/PollManager.test.js (test nickname uniqueness, room full validation)
- [ ] T055 [P] [US2] Unit test for PollManager.recordVote() in backend/tests/unit/PollManager.test.js (test vote recording, vote change, state validation)
- [ ] T056 [P] [US2] Unit test for vote counting in backend/tests/unit/voteTracker.test.js (test counts, percentages calculation)
- [ ] T057 [P] [US2] Contract test for join-room Socket.io event in backend/tests/contract/websocket.test.js (test success, nickname taken, poll not found, room full errors)
- [ ] T058 [P] [US2] Contract test for submit-vote Socket.io event in backend/tests/contract/websocket.test.js (test success, voting not open, invalid option errors)
- [ ] T059 [US2] Integration test for participant join-vote flow in backend/tests/integration/participantFlow.test.js (join → vote → confirm → change vote)

### Implementation for User Story 2

- [ ] T060 [P] [US2] Implement PollManager.addParticipant() method with nickname uniqueness and capacity validation
- [ ] T061 [P] [US2] Implement PollManager.recordVote() method with state validation and vote counting
- [ ] T062 [P] [US2] Create vote counting logic methods in PollManager (_calculateVoteCounts, _calculatePercentages)
- [ ] T063 [US2] Implement join-room Socket.io event handler in backend/src/sockets/events/joinRoom.js with acknowledgment
- [ ] T064 [US2] Implement submit-vote Socket.io event handler in backend/src/sockets/events/submitVote.js with acknowledgment
- [ ] T065 [US2] Implement broadcastVoteUpdate emitter in backend/src/sockets/emitters/broadcastVoteUpdate.js (vote-update event)
- [ ] T066 [US2] Add participant-joined broadcast to join-room handler
- [ ] T067 [P] [US2] Create JoinPage component in frontend/src/pages/JoinPage.js with room code and nickname form
- [ ] T068 [P] [US2] Create VotePage component in frontend/src/pages/VotePage.js with question display and option selection
- [ ] T069 [P] [US2] Create VoteConfirmation component in frontend/src/components/VoteConfirmation.js (toast/modal for vote success)
- [ ] T070 [US2] Connect JoinPage to socketService (join-room event with acknowledgment handling)
- [ ] T071 [US2] Connect VotePage to socketService (submit-vote event with acknowledgment handling)
- [ ] T072 [US2] Add Socket.io event listeners in VotePage for vote-update, poll-state-changed
- [ ] T073 [US2] Add client-side validation for room code format, nickname length
- [ ] T074 [US2] Add error handling for join failures (invalid code, nickname taken, room full)
- [ ] T075 [US2] Add error handling for vote failures (voting not open, invalid option)
- [ ] T076 [US2] Add logging for participant join, vote submission, vote changes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Live Results Display (Priority: P3)

**Goal**: Enable real-time vote updates for all participants and hosts, with immediate feedback on vote counts, percentages, and participant count changes

**Independent Test**: Multiple participants can vote and all clients see vote counts update in real-time without page refresh

### Tests for User Story 3 (TDD Required by Constitution)

- [ ] T077 [P] [US3] Integration test for multi-client vote synchronization in backend/tests/integration/realTimeSync.test.js (3 clients: host + 2 participants)
- [ ] T078 [P] [US3] Contract test for vote-update broadcast schema in backend/tests/contract/websocket.test.js (votes array, percentages array)
- [ ] T079 [P] [US3] Contract test for participant-joined broadcast schema in backend/tests/contract/websocket.test.js (nickname, count)
- [ ] T080 [P] [US3] Contract test for participant-left broadcast schema in backend/tests/contract/websocket.test.js (nickname, count)

### Implementation for User Story 3

- [ ] T081 [P] [US3] Implement disconnect Socket.io event handler in backend/src/sockets/events/disconnect.js with participant cleanup
- [ ] T082 [P] [US3] Implement PollManager.removeParticipant() method with poll cleanup when empty (FR-020)
- [ ] T083 [US3] Add participant-left broadcast to disconnect handler
- [ ] T084 [US3] Ensure vote-update broadcasts to all room clients after every vote submission
- [ ] T085 [US3] Ensure participant-joined broadcasts to all room clients on join
- [ ] T086 [US3] Ensure poll-state-changed broadcasts to all room clients on state change
- [ ] T087 [P] [US3] Add real-time vote count updates to PollResults component (chart.js integration)
- [ ] T088 [P] [US3] Add real-time participant count updates to ParticipantCounter component
- [ ] T089 [P] [US3] Add real-time state change notifications to VotePage (voting closed message)
- [ ] T090 [US3] Implement reconnection handling in socketService (sessionStorage for room code/nickname, auto-rejoin on reconnect event)
- [ ] T091 [US3] Add "Reconnecting..." UI state in VotePage and HostDashboard for disconnect event
- [ ] T092 [US3] Add Socket.io connection status indicators to all pages (connected/disconnected)
- [ ] T093 [US3] Add logging for broadcasts, disconnections, reconnections

**Checkpoint**: All user stories should now be independently functional with full real-time synchronization

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T094 [P] Create room code formatter utility in frontend/src/utils/roomCodeFormatter.js (display formatting)
- [ ] T095 [P] Add unit tests for frontend components in frontend/tests/unit/components.test.js
- [ ] T096 [P] Add end-to-end user flow tests in frontend/tests/integration/userFlows.test.js (simulate host + participant interactions)
- [ ] T097 Add performance testing for 20 concurrent participants (verify <2s broadcast latency per SC-004)
- [ ] T098 [P] Add security validation (input sanitization, room code validation, SQL injection prevention in validators)
- [ ] T099 [P] Add comprehensive error logging for all error paths
- [ ] T100 Verify all acceptance scenarios from spec.md (5 scenarios per user story = 15 total)
- [ ] T101 Run quickstart.md manual testing workflow (all 3 user stories + 7 edge cases)
- [ ] T102 [P] Code cleanup and refactoring (remove console.logs, unused imports)
- [ ] T103 Run ESLint and Prettier across entire codebase (backend and frontend)
- [ ] T104 Verify pre-commit hooks work correctly (trigger lint-staged, block commit on failure)
- [ ] T105 [P] Update CLAUDE.md with final technology stack and project structure
- [ ] T106 Verify test coverage ≥90% for backend core logic (PollManager, event handlers)
- [ ] T107 Final constitution compliance check (all 6 principles satisfied)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for poll existence, but independently testable with pre-created polls
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1/US2 with real-time features, but core voting works without it

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per constitution Principle IV)
- Models/core logic before routes/handlers
- Backend implementation before frontend integration
- Core functionality before error handling/logging
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: T004-T005 (backend setup) can run parallel with T012-T014 (frontend setup), T006-T011 (backend config) and T015-T016 (frontend config) can run in parallel
- **Phase 2 (Foundational)**: T019-T020 (config), T021-T023 (core services), T024-T025 (middleware), T029-T030 (frontend services) can all run in parallel
- **User Story 1 Tests**: T032-T037 can all run in parallel
- **User Story 1 Implementation**: T039-T041 (PollManager methods), T046-T049 (frontend components) can run in parallel
- **User Story 2 Tests**: T054-T058 can all run in parallel
- **User Story 2 Implementation**: T060-T062 (PollManager methods), T067-T069 (frontend components) can run in parallel
- **User Story 3 Tests**: T077-T080 can all run in parallel
- **User Story 3 Implementation**: T081-T082 (disconnect handling), T087-T089 (frontend real-time updates) can run in parallel
- **Polish**: T094-T096, T098-T099, T102-T103, T105-T106 can run in parallel
- **Between Stories**: Once Foundational completes, US1, US2, and US3 can all start in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for PollManager.createPoll() in backend/tests/unit/PollManager.test.js"
Task: "Unit test for PollManager.changePollState() in backend/tests/unit/PollManager.test.js"
Task: "Unit test for roomCodeGenerator in backend/tests/unit/roomCodeGenerator.test.js"
Task: "Contract test for POST /api/polls in backend/tests/contract/pollApi.test.js"
Task: "Contract test for GET /api/polls/:roomCode in backend/tests/contract/pollApi.test.js"
Task: "Contract test for change-poll-state Socket.io event in backend/tests/contract/websocket.test.js"

# Launch PollManager methods together:
Task: "Implement PollManager.createPoll() method"
Task: "Implement PollManager.getPoll() method"
Task: "Implement PollManager.changePollState() method"

# Launch all frontend components for User Story 1 together:
Task: "Create HostDashboard component in frontend/src/pages/HostDashboard.js"
Task: "Create PollControls component in frontend/src/components/PollControls.js"
Task: "Create PollResults component in frontend/src/components/PollResults.js"
Task: "Create ParticipantCounter component in frontend/src/components/ParticipantCounter.js"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for PollManager.addParticipant() in backend/tests/unit/PollManager.test.js"
Task: "Unit test for PollManager.recordVote() in backend/tests/unit/PollManager.test.js"
Task: "Unit test for vote counting in backend/tests/unit/voteTracker.test.js"
Task: "Contract test for join-room Socket.io event in backend/tests/contract/websocket.test.js"
Task: "Contract test for submit-vote Socket.io event in backend/tests/contract/websocket.test.js"

# Launch all frontend components for User Story 2 together:
Task: "Create JoinPage component in frontend/src/pages/JoinPage.js"
Task: "Create VotePage component in frontend/src/pages/VotePage.js"
Task: "Create VoteConfirmation component in frontend/src/components/VoteConfirmation.js"
```

---

## Parallel Example: User Story 3

```bash
# Launch all tests for User Story 3 together:
Task: "Integration test for multi-client vote synchronization in backend/tests/integration/realTimeSync.test.js"
Task: "Contract test for vote-update broadcast schema in backend/tests/contract/websocket.test.js"
Task: "Contract test for participant-joined broadcast schema in backend/tests/contract/websocket.test.js"
Task: "Contract test for participant-left broadcast schema in backend/tests/contract/websocket.test.js"

# Launch disconnect handling and frontend updates together:
Task: "Implement disconnect Socket.io event handler in backend/src/sockets/events/disconnect.js"
Task: "Implement PollManager.removeParticipant() method"
Task: "Add real-time vote count updates to PollResults component"
Task: "Add real-time participant count updates to ParticipantCounter component"
Task: "Add real-time state change notifications to VotePage"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T018)
2. Complete Phase 2: Foundational (T019-T031) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T032-T053)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md
5. Deploy/demo if ready (host can create, control, and view poll results)

**MVP Deliverable**: Hosts can create polls, receive room codes, open/close voting, and view live results. This is a fully functional, demonstrable feature.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T031)
2. Add User Story 1 → Test independently → Deploy/Demo (T032-T053) **← MVP!**
3. Add User Story 2 → Test independently → Deploy/Demo (T054-T076) **← Participants can now vote**
4. Add User Story 3 → Test independently → Deploy/Demo (T077-T093) **← Full real-time experience**
5. Polish & validate → Final release (T094-T107)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T031)
2. **Once Foundational is done:**
   - Developer A: User Story 1 (T032-T053) - Host functionality
   - Developer B: User Story 2 (T054-T076) - Participant functionality
   - Developer C: User Story 3 (T077-T093) - Real-time enhancements
3. Stories complete and integrate independently
4. Team reconvenes for Polish phase (T094-T107)

### TDD Workflow (Constitution Principle IV)

For each user story:
1. **Write tests first** (all test tasks marked [P] can run in parallel)
2. **Run tests** → Verify they FAIL (Red)
3. **Implement features** → Make tests pass (Green)
4. **Refactor** → Clean up code while keeping tests green
5. **Commit** → Pre-commit hooks enforce linting, formatting, tests pass

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **TDD required**: Constitution Principle IV mandates tests before implementation
- **Pre-commit checks**: Constitution Principle V requires ESLint, Prettier, tests passing before commits
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Red-Green-Refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Phase 1 (Setup)**: 18 tasks (T001-T018)
- **Phase 2 (Foundational)**: 13 tasks (T019-T031)
- **Phase 3 (User Story 1)**: 22 tasks (T032-T053) - 7 tests + 15 implementation
- **Phase 4 (User Story 2)**: 23 tasks (T054-T076) - 6 tests + 17 implementation
- **Phase 5 (User Story 3)**: 17 tasks (T077-T093) - 4 tests + 13 implementation
- **Phase 6 (Polish)**: 14 tasks (T094-T107)

**Total**: 107 tasks

**MVP Scope (User Story 1 only)**: 53 tasks (T001-T053)
**Full Feature Scope**: 107 tasks

**Parallel Opportunities**:
- Phase 1: 13 tasks can run in parallel
- Phase 2: 8 tasks can run in parallel
- User Story 1 tests: 6 tasks can run in parallel
- User Story 1 implementation: 8 tasks can run in parallel
- User Story 2 tests: 5 tasks can run in parallel
- User Story 2 implementation: 6 tasks can run in parallel
- User Story 3 tests: 4 tasks can run in parallel
- User Story 3 implementation: 5 tasks can run in parallel
- Polish: 8 tasks can run in parallel

**Independent Test Validation**:
- User Story 1: Testable with simulated votes, no participant interaction needed
- User Story 2: Testable with pre-created polls from US1
- User Story 3: Testable with multiple client connections, verifies real-time sync
