# Tasks: End-to-End Testing Infrastructure

**Input**: Design documents from `/specs/013-e2e-testing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature IS testing infrastructure - test tasks are the core implementation

**Organization**: Tasks are grouped by user story (test scenarios) to enable independent implementation and testing of each story

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Repository root `tests/e2e/` for E2E tests
- Backend: `backend/src/`, Frontend: `frontend/src/`
- E2E tests interact with both stacks via browser automation

---

## Phase 1: Setup (E2E Infrastructure)

**Purpose**: Install Playwright, configure test environment, create base structure

- [x] T001 Install Playwright dependencies (@playwright/test@^1.40.0, playwright@^1.40.0, wait-on@^7.0.0) in package.json
- [x] T002 Install Playwright browser binaries (npx playwright install chromium firefox webkit)
- [x] T003 Create E2E directory structure (tests/e2e/{config,fixtures,pages,specs,helpers})
- [x] T004 Configure Playwright settings in tests/e2e/config/playwright.config.js (browsers, workers, timeouts, retries)
- [x] T005 [P] Create test environment configuration in tests/e2e/config/test-env.js (URLs, ports, timeouts)
- [x] T006 [P] Add E2E test scripts to root package.json (test:e2e, test:e2e:headed, test:e2e:debug)

---

## Phase 2: Foundational (Base Test Infrastructure)

**Purpose**: Core page objects and utilities that ALL test scenarios depend on

**⚠️ CRITICAL**: No user story test scenarios can be written until this phase is complete

- [x] T007 Create BasePage class in tests/e2e/pages/common/BasePage.js (goto, waitForLoad, screenshot, waitForSelector methods per contract)
- [x] T008 [P] Implement test data generators in tests/e2e/fixtures/pollData.js (generatePoll, generateParticipant, generateVote functions)
- [x] T009 [P] Create cleanup fixture in tests/e2e/fixtures/testUtils.js (CleanupTracker class with trackPoll, trackConnection, cleanup methods)
- [x] T010 [P] Implement WebSocket helpers in tests/e2e/helpers/websocketHelpers.js (captureSocketEvents, waitForSocketEvent, getSocketEvents, clearSocketEvents, assertEventReceived per contract)
- [x] T011 [P] Implement browser helpers in tests/e2e/helpers/browserHelpers.js (waitForNetworkIdle, retryOperation, createMultipleContexts per contract)
- [ ] T012 Create HostDashboardPage class in tests/e2e/pages/HostDashboardPage.js (createPoll, getRoomCode, openVoting, closeVoting, getResults, getParticipantCount, getPollState methods per contract)
- [ ] T013 [P] Create JoinPage class in tests/e2e/pages/JoinPage.js (joinPoll, getErrorMessage, isJoinSuccessful methods per contract)
- [ ] T014 [P] Create VotePage class in tests/e2e/pages/VotePage.js (getPollQuestion, getOptions, selectOption, submitVote, getConfirmation, isVotingDisabled, getCurrentVote, changeVote methods per contract)

**Checkpoint**: Foundation ready - test scenario implementation can now begin in parallel

---

## Phase 3: User Story 1 - Complete Host Poll Lifecycle Testing (Priority: P1) 🎯 MVP

**Goal**: Automate complete host workflow from poll creation through results viewing to ensure all critical host functionality works correctly

**Independent Test**: Verify tests execute host dashboard access → poll creation → receive room code → open voting → view live results → close voting without requiring participant tests

### Test Scenarios for User Story 1

> **NOTE: Write these test specs FIRST using TDD approach (test → fail → implement page objects → pass)**

- [ ] T015 [US1] Test: Host navigates to dashboard and sees poll creation form in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 1)
- [ ] T016 [US1] Test: Host creates poll with question and 3 options, receives 6-character room code in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 2)
- [ ] T017 [US1] Test: Host opens voting, poll state changes to 'open', controls update in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 3)
- [ ] T018 [US1] Test: Host views live-updating vote counts and percentages in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 4 - simulate votes via API)
- [ ] T019 [US1] Test: Host closes voting, poll state changes to 'closed', final results displayed in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 5)
- [ ] T020 [US1] Test: Host refreshes browser during active poll, state and data persist in tests/e2e/specs/host-lifecycle.spec.js (Acceptance Scenario 6)

### Implementation/Refinement for User Story 1

- [ ] T021 [US1] Refine HostDashboardPage selectors based on test failures (update CSS selectors to match actual frontend elements)
- [ ] T022 [US1] Add WebSocket event capture to tests for real-time state changes (poll-state-changed events)
- [ ] T023 [US1] Verify all 6 test scenarios pass independently and cleanup properly

**Checkpoint**: At this point, User Story 1 tests should be fully functional, providing automated validation of host poll lifecycle

---

## Phase 4: User Story 2 - Complete Participant Vote Journey Testing (Priority: P2)

**Goal**: Automate participant experience from joining poll through vote submission to ensure seamless audience participation

**Independent Test**: Verify tests execute join with room code → view poll → submit vote → receive confirmation → change vote → verify disabled when closed

### Test Scenarios for User Story 2

- [ ] T024 [P] [US2] Test: Participant joins poll with valid room code and nickname, sees question and options in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 1)
- [ ] T025 [P] [US2] Test: Participant submits vote, receives instant confirmation in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 2)
- [ ] T026 [P] [US2] Test: Participant changes vote while voting open, previous vote replaced in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 3)
- [ ] T027 [P] [US2] Test: Participant attempts join with invalid room code, sees error 'Poll not found' in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 4)
- [ ] T028 [P] [US2] Test: Participant attempts join with duplicate nickname, sees error requesting different nickname in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 5)
- [ ] T029 [P] [US2] Test: Host closes voting, participant interface updates to disable vote submission in real-time in tests/e2e/specs/participant-journey.spec.js (Acceptance Scenario 6)

### Implementation/Refinement for User Story 2

- [ ] T030 [US2] Refine JoinPage and VotePage selectors based on test failures
- [ ] T031 [US2] Add WebSocket event capture for vote confirmations and state changes (vote-update, poll-state-changed events)
- [ ] T032 [US2] Verify all 6 test scenarios pass and cleanup properly (close connections, delete test polls)

**Checkpoint**: At this point, User Story 2 tests should validate complete participant voting journey independently of other test suites

---

## Phase 5: User Story 3 - Real-Time Multi-User Interaction Testing (Priority: P3)

**Goal**: Test concurrent multi-user scenarios to verify WebSocket reliability, vote synchronization, and participant count accuracy

**Independent Test**: Verify tests spawn 10 participants → join concurrently → submit votes simultaneously → validate real-time updates and accurate counts

### Test Scenarios for User Story 3

- [ ] T033 [P] [US3] Test: 10 participants join simultaneously, all connect successfully, host sees accurate count (10) in tests/e2e/specs/multi-user.spec.js (Acceptance Scenario 1)
- [ ] T034 [P] [US3] Test: 10 participants submit votes within 1 second, all recorded correctly, vote counts update on all clients within 2 seconds in tests/e2e/specs/multi-user.spec.js (Acceptance Scenario 2)
- [ ] T035 [P] [US3] Test: One participant disconnects, participant count decrements accurately on host dashboard within 1 second in tests/e2e/specs/multi-user.spec.js (Acceptance Scenario 3)
- [ ] T036 [P] [US3] Test: Host changes poll state, all participants receive state change notification within 1 second in tests/e2e/specs/multi-user.spec.js (Acceptance Scenario 4)
- [ ] T037 [P] [US3] Test: Multiple participants voting, all clients display consistent vote totals with no data discrepancies in tests/e2e/specs/multi-user.spec.js (Acceptance Scenario 5)

### Implementation/Refinement for User Story 3

- [ ] T038 [US3] Implement createMultipleContexts helper for spawning 10 concurrent browser sessions
- [ ] T039 [US3] Add timing assertions for WebSocket event delivery (<2 seconds for vote updates, <1 second for state changes)
- [ ] T040 [US3] Verify all 5 test scenarios pass, measure performance (test execution <30 seconds), cleanup all connections

**Checkpoint**: At this point, User Story 3 tests should validate real-time multi-user scenarios and performance under concurrent load

---

## Phase 6: User Story 4 - Cross-Browser and Error Handling Testing (Priority: P4)

**Goal**: Verify application behavior across different browsers and test error recovery scenarios

**Independent Test**: Verify tests run in Chrome/Firefox/Safari → simulate network interruptions → test error messages → validate input validation

### Test Scenarios for User Story 4

- [ ] T041 [P] [US4] Test: Core workflows pass in Chrome, Firefox, and Safari in tests/e2e/specs/cross-browser.spec.js (Acceptance Scenario 1)
- [ ] T042 [P] [US4] Test: Participant network connection drops temporarily, WebSocket reconnects, participant can continue voting in tests/e2e/specs/cross-browser.spec.js (Acceptance Scenario 2)
- [ ] T043 [P] [US4] Test: Host attempts poll creation with only 1 option, sees error requiring at least 2 options in tests/e2e/specs/cross-browser.spec.js (Acceptance Scenario 3)
- [ ] T044 [P] [US4] Test: Participant vote submission fails (backend error), sees error message and can retry in tests/e2e/specs/cross-browser.spec.js (Acceptance Scenario 4)
- [ ] T045 [P] [US4] Test: User session expires, receives clear error message explaining need to rejoin in tests/e2e/specs/cross-browser.spec.js (Acceptance Scenario 5)

### Implementation/Refinement for User Story 4

- [ ] T046 [US4] Configure Playwright to run tests across all 3 browser projects (chromium, firefox, webkit) in playwright.config.js
- [ ] T047 [US4] Implement network simulation helpers (simulate disconnection, slow network, backend failures)
- [ ] T048 [US4] Verify all 5 test scenarios pass across all browsers, document any browser-specific issues

**Checkpoint**: At this point, User Story 4 tests should validate cross-browser compatibility and robust error handling

---

## Phase 7: Edge Cases Testing

**Goal**: Test boundary conditions and unusual scenarios from spec.md Edge Cases section

- [ ] T049 [P] Test: WebSocket connection drops during vote submission, vote handled correctly in tests/e2e/specs/edge-cases.spec.js
- [ ] T050 [P] Test: Concurrent vote submissions from same participant, system handles correctly in tests/e2e/specs/edge-cases.spec.js
- [ ] T051 [P] Test: Backend server restarts while polls active, system recovers gracefully in tests/e2e/specs/edge-cases.spec.js
- [ ] T052 [P] Test: Room code generation collision handling (simulate if possible) in tests/e2e/specs/edge-cases.spec.js
- [ ] T053 [P] Test: Host opens voting, closes it, then opens again, system handles correctly in tests/e2e/specs/edge-cases.spec.js
- [ ] T054 [P] Test: Participant attempts join after voting closes, receives appropriate error in tests/e2e/specs/edge-cases.spec.js
- [ ] T055 [P] Test: Browser localStorage full or disabled, system handles gracefully in tests/e2e/specs/edge-cases.spec.js
- [ ] T056 [P] Test: Maximum participant limits (20+ users), system maintains performance in tests/e2e/specs/edge-cases.spec.js
- [ ] T057 [P] Test: Network latency exceeds 5 seconds, timeouts handled correctly in tests/e2e/specs/edge-cases.spec.js
- [ ] T058 [P] Test: Malformed WebSocket messages, system validates and rejects in tests/e2e/specs/edge-cases.spec.js

**Checkpoint**: Edge case coverage complete, system robustness validated

---

## Phase 8: CI/CD Integration & Polish

**Goal**: Integrate E2E tests into CI/CD pipeline and ensure production-ready quality

- [ ] T059 Create GitHub Actions workflow in .github/workflows/e2e-tests.yml (run on PR, start backend/frontend, wait for services, run tests, upload artifacts on failure)
- [ ] T060 [P] Configure test retries for flakiness mitigation (2 retries in CI, 0 local) in playwright.config.js
- [ ] T061 [P] Configure screenshot and video capture on failure in playwright.config.js
- [ ] T062 [P] Set up HTML report generation (npx playwright show-report command)
- [ ] T063 Validate all tests pass in CI environment (simulate with CI=true npm run test:e2e)
- [ ] T064 [P] Measure and document test suite performance (total execution time <5 minutes, flakiness rate <5%)
- [ ] T065 [P] Add test execution documentation to root README.md (how to run tests, troubleshooting)
- [ ] T066 Run quickstart validation checklist from specs/013-e2e-testing/quickstart.md (all 10 steps)
- [ ] T067 Verify all success criteria from spec.md (SC-001 through SC-012)

**Checkpoint**: E2E testing infrastructure complete, integrated with CI/CD, ready for production use

---

## Dependencies & Execution Order

### Story Dependencies (Completion Order)

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (Edge Cases) → Phase 8 (CI/CD)
                                              ↓              ↓              ↓              ↓
                                              (Can run in parallel after Phase 2 complete, but recommended sequential for first implementation)
```

**Critical Path**:
1. Phase 1 (Setup) MUST complete first - installs dependencies
2. Phase 2 (Foundational) MUST complete second - provides base classes all tests use
3. Phase 3-6 (User Stories) CAN run in parallel but RECOMMENDED sequential for initial implementation:
   - US1 (P1) validates foundation works, informs later stories
   - US2 (P2) depends on polls existing (created by host in US1 tests)
   - US3 (P3) builds on US1 + US2 scenarios
   - US4 (P4) runs existing tests in multiple browsers
4. Phase 7 (Edge Cases) should run after Phase 3-6 complete
5. Phase 8 (CI/CD) runs last - integrates completed test suite

### Parallel Execution Opportunities

**Within Phase 1** (Setup):
- T005, T006 can run in parallel after T001-T004

**Within Phase 2** (Foundational):
- T008, T009, T010, T011 can run in parallel (different files)
- T013, T014 can run in parallel after T012 (HostDashboardPage must exist first for inheritance)

**Within Phase 3** (US1):
- T015-T020 tests can be written in parallel (same file but different test blocks)
- T021-T023 run sequentially after tests written

**Within Phase 4** (US2):
- T024-T029 tests can be written in parallel (all [P] marked)
- T030-T032 run sequentially after tests written

**Within Phase 5** (US3):
- T033-T037 tests can be written in parallel (all [P] marked)
- T038-T040 run sequentially after tests written

**Within Phase 6** (US4):
- T041-T045 tests can be written in parallel (all [P] marked)
- T046-T048 run sequentially after tests written

**Within Phase 7** (Edge Cases):
- T049-T058 can all run in parallel (all [P] marked, different test scenarios)

**Within Phase 8** (CI/CD):
- T060, T061, T062, T064, T065 can run in parallel after T059

### Example: Parallel Execution Within User Story 1

```bash
# Developer 1: Write test for Acceptance Scenario 1 (T015)
# Developer 2: Write test for Acceptance Scenario 2 (T016)
# Developer 3: Write test for Acceptance Scenario 3 (T017)
# ... (all T015-T020 can be written simultaneously)

# Then sequentially:
# 1. Run tests (they should fail - no page objects implemented yet)
# 2. Implement HostDashboardPage methods (T021)
# 3. Add WebSocket capture (T022)
# 4. Verify all pass (T023)
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1)

**Rationale**:
- Validates E2E infrastructure works (Playwright, page objects, fixtures)
- Provides automated testing for highest-priority workflow (host poll lifecycle)
- Delivers immediate value (prevents regressions in core host features)
- Can ship to CI/CD and start catching bugs

**MVP Deliverables**:
- ✅ Playwright installed and configured
- ✅ Base page objects and utilities functional
- ✅ 6 host lifecycle test scenarios passing
- ✅ Cleanup and resource management working
- ✅ Can run locally and in CI

### Incremental Delivery Beyond MVP

**Phase 3 → Phase 4**: Add participant journey tests (next highest value)
**Phase 4 → Phase 5**: Add multi-user tests (validates concurrency and performance)
**Phase 5 → Phase 6**: Add cross-browser tests (catches browser-specific bugs)
**Phase 6 → Phase 7**: Add edge case tests (validates robustness)
**Phase 7 → Phase 8**: Integrate with CI/CD (enables automation)

Each phase delivers standalone value and can be deployed independently to CI/CD.

---

## Task Summary

| Phase | Task Range | Count | Story | Parallelizable |
|-------|-----------|-------|-------|----------------|
| Phase 1: Setup | T001-T006 | 6 | N/A | 2 tasks [P] |
| Phase 2: Foundational | T007-T014 | 8 | N/A | 6 tasks [P] |
| Phase 3: US1 (P1) | T015-T023 | 9 | US1 | 6 test tasks can be written in parallel |
| Phase 4: US2 (P2) | T024-T032 | 9 | US2 | 6 test tasks [P] |
| Phase 5: US3 (P3) | T033-T040 | 8 | US3 | 5 test tasks [P] |
| Phase 6: US4 (P4) | T041-T048 | 8 | US4 | 5 test tasks [P] |
| Phase 7: Edge Cases | T049-T058 | 10 | N/A | 10 tasks [P] |
| Phase 8: CI/CD & Polish | T059-T067 | 9 | N/A | 5 tasks [P] |
| **TOTAL** | **T001-T067** | **67** | **4 stories** | **45 tasks parallelizable** |

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 67 tasks completed and checked off
- [ ] All test scenarios pass locally (npm run test:e2e)
- [ ] All test scenarios pass in CI (GitHub Actions)
- [ ] Test suite execution time <5 minutes in CI (SC-008)
- [ ] Host workflow tests complete in <30 seconds each (SC-001)
- [ ] Participant workflow tests complete in <20 seconds each (SC-002)
- [ ] 100% coverage of core workflows achieved (SC-003)
- [ ] Tests successfully verify 10 concurrent participants (SC-004)
- [ ] Tests execute across Chrome, Firefox, Safari (SC-005)
- [ ] Flakiness rate <5% across multiple runs (SC-006)
- [ ] Screenshots generated on test failure (SC-007)
- [ ] Real-time synchronization issues detected when latency >2s (SC-009)
- [ ] Zero false positives in test results (SC-010)
- [ ] All 10 edge cases from spec.md have tests (SC-011)
- [ ] 100% of error scenarios have automated tests (SC-012)
- [ ] Quickstart validation checklist completed (10 steps)
- [ ] All page objects follow contract interfaces (see contracts/)
- [ ] All test utilities follow contract interfaces (see contracts/)
- [ ] Test code passes linting and formatting (ESLint, Prettier)
- [ ] No orphaned test data after test execution (cleanup working)
- [ ] Documentation updated (README.md includes E2E test instructions)

---

## Notes

- **TDD Approach**: This feature IS testing infrastructure, so "tests" are the core deliverables. Follow TDD pattern: write test spec → run (should fail if testing new feature) → implement page objects/helpers → tests pass.
- **Resource Cleanup**: Every test MUST clean up created resources (polls, WebSocket connections) via fixtures to prevent test pollution.
- **WebSocket Testing**: Use captureSocketEvents helper at start of each test requiring real-time validation, assert on captured events at end.
- **Flakiness Prevention**: Use Playwright auto-wait (waitForSelector) instead of fixed timeouts, configure retries in CI, ensure test isolation.
- **Cross-Browser**: Playwright config runs same tests across chromium, firefox, webkit projects automatically - no test duplication needed.
- **Performance**: If tests exceed time limits, investigate slow page objects, add parallel execution, or optimize wait times.
- **CI/CD**: Tests must pass in GitHub Actions before merge - local passing is necessary but not sufficient validation.
