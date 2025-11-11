# Tasks: Service Layer Unit Tests

**Input**: Design documents from `/specs/007-service-layer-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature IS about tests - TDD workflow applied

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- This feature only modifies frontend test files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify test infrastructure is ready (already exists from feature #004)

- [x] T001 Verify Jest configuration exists in frontend/jest.config.js
- [x] T002 Verify test setup file exists in frontend/tests/setup.js
- [x] T003 Verify babel configuration exists in frontend/.babelrc
- [x] T004 Review existing test pattern in frontend/tests/contract/HostDashboard.test.js for mocking reference

**Checkpoint**: Test infrastructure verified - ready to write service layer tests

---

## Phase 2: User Story 1 - API Service Test Coverage (Priority: P1) 🎯 MVP

**Goal**: Create comprehensive unit tests for `apiService.js` to achieve ≥80% code coverage, enabling confident refactoring and debugging of API communication logic.

**Independent Test**: Run `cd frontend && npm test -- apiService.test.js --coverage` and verify ≥80% coverage for all metrics.

### Tests for apiService (TDD Workflow)

**Step 1: Write tests (these WILL fail initially - that's correct!)**

- [x] T005 [US1] Create frontend/tests/unit/apiService.test.js with file structure and imports
- [x] T006 [US1] Add global fetch mock setup and beforeEach cleanup in apiService.test.js
- [x] T007 [P] [US1] Write createPoll success test cases (CP-001, CP-002, CP-003) in apiService.test.js
- [x] T008 [P] [US1] Write createPoll error test cases (CP-004, CP-005, CP-006, CP-007) in apiService.test.js
- [x] T009 [P] [US1] Write createPoll error message handling tests (CP-008, CP-009) in apiService.test.js
- [x] T010 [P] [US1] Write getPoll success test cases (GP-001, GP-002) in apiService.test.js
- [x] T011 [P] [US1] Write getPoll error test cases (GP-003, GP-004, GP-005) in apiService.test.js
- [x] T012 [P] [US1] Write getPoll error message handling tests (GP-006, GP-007) in apiService.test.js
- [x] T013 [P] [US1] Write checkHealth test cases (CH-001, CH-002, CH-003, CH-004) in apiService.test.js

**Step 2: Verify tests are complete and all pass**

- [x] T014 [US1] Run tests and verify all 20 test cases pass: `cd frontend && npm test -- apiService.test.js`
- [x] T015 [US1] Verify ≥80% coverage for apiService.js: `cd frontend && npm test -- apiService.test.js --coverage --collectCoverageFrom='src/services/apiService.js'`
- [x] T016 [US1] Verify tests follow Arrange-Act-Assert pattern (code review)
- [x] T017 [US1] Verify all mocks properly cleaned up in beforeEach (code review)
- [x] T018 [US1] Run linter on test file: `cd frontend && npm run lint tests/unit/apiService.test.js`
- [x] T019 [US1] Run formatter on test file: `cd frontend && npm run format tests/unit/apiService.test.js`

**Checkpoint**: At this point, User Story 1 should be complete - apiService.test.js exists with ≥80% coverage

**Test Validation**:
```bash
cd frontend
npm test -- apiService.test.js
# Expected: 20 tests pass, 0 failures
npm test -- apiService.test.js --coverage --collectCoverageFrom='src/services/apiService.js'
# Expected: Statements ≥80%, Branches ≥80%, Functions ≥80%, Lines ≥80%
```

---

## Phase 3: User Story 2 - Socket Service Test Coverage (Priority: P1)

**Goal**: Create comprehensive unit tests for `socketService.js` to achieve ≥80% code coverage, ensuring WebSocket event handling, reconnection logic, and listener management work correctly.

**Independent Test**: Run `cd frontend && npm test -- socketService.test.js --coverage` and verify ≥80% coverage for all metrics.

### Tests for socketService (TDD Workflow)

**Step 1: Write tests (these WILL fail initially - that's correct!)**

- [ ] T020 [US2] Create frontend/tests/unit/socketService.test.js with file structure and socket.io-client mock
- [ ] T021 [US2] Add mock socket object setup and beforeEach cleanup in socketService.test.js
- [ ] T022 [US2] Add sessionStorage.clear() in beforeEach to prevent test pollution
- [ ] T023 [P] [US2] Write module initialization tests (INIT-001, INIT-002, INIT-003) in socketService.test.js
- [ ] T024 [P] [US2] Write joinRoom tests (JR-001, JR-002, JR-003, JR-004) in socketService.test.js
- [ ] T025 [P] [US2] Write submitVote tests (SV-001, SV-002, SV-003, SV-004) in socketService.test.js
- [ ] T026 [P] [US2] Write changePollState tests (CPS-001, CPS-002, CPS-003) in socketService.test.js
- [ ] T027 [P] [US2] Write joinSocketRoom test (JSR-001, JSR-002) in socketService.test.js
- [ ] T028 [P] [US2] Write event listener registration tests (ON-001, ON-002, ON-003, ON-004) in socketService.test.js
- [ ] T029 [P] [US2] Write event listener cleanup tests (OFF-001, OFF-002, OFF-003, OFF-004) in socketService.test.js
- [ ] T030 [P] [US2] Write connection status callback tests (CS-001, CS-002, CS-003) in socketService.test.js
- [ ] T031 [P] [US2] Write reconnecting callback tests (RC-001, RC-002) in socketService.test.js
- [ ] T032 [P] [US2] Write getConnectionStatus tests (GCS-001, GCS-002) in socketService.test.js
- [ ] T033 [P] [US2] Write disconnect test (DC-001) in socketService.test.js
- [ ] T034 [P] [US2] Write connect event handler tests (CONN-001, CONN-002, CONN-003, CONN-004) in socketService.test.js
- [ ] T035 [P] [US2] Write disconnect event handler test (DISC-001) in socketService.test.js
- [ ] T036 [P] [US2] Write reconnecting event handler test (RECO-001) in socketService.test.js
- [ ] T037 [P] [US2] Write reconnect event handler test (RECS-001) in socketService.test.js
- [ ] T038 [P] [US2] Write reconnect_failed event handler test (RECF-001) in socketService.test.js
- [ ] T039 [P] [US2] Write edge case tests (multiple listeners, callback removal, failed rejoin, missing sessionStorage) in socketService.test.js

**Step 2: Verify tests are complete and all pass**

- [ ] T040 [US2] Run tests and verify all 35-40 test cases pass: `cd frontend && npm test -- socketService.test.js`
- [ ] T041 [US2] Verify ≥80% coverage for socketService.js: `cd frontend && npm test -- socketService.test.js --coverage --collectCoverageFrom='src/services/socketService.js'`
- [ ] T042 [US2] Verify tests follow Arrange-Act-Assert pattern (code review)
- [ ] T043 [US2] Verify all mocks and sessionStorage properly cleaned up in beforeEach (code review)
- [ ] T044 [US2] Run linter on test file: `cd frontend && npm run lint tests/unit/socketService.test.js`
- [ ] T045 [US2] Run formatter on test file: `cd frontend && npm run format tests/unit/socketService.test.js`

**Checkpoint**: At this point, User Story 2 should be complete - socketService.test.js exists with ≥80% coverage

**Test Validation**:
```bash
cd frontend
npm test -- socketService.test.js
# Expected: 35-40 tests pass, 0 failures
npm test -- socketService.test.js --coverage --collectCoverageFrom='src/services/socketService.js'
# Expected: Statements ≥80%, Branches ≥80%, Functions ≥80%, Lines ≥80%
```

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verify overall quality and integration

- [ ] T046 [P] Run full test suite and verify all tests pass: `cd frontend && npm test`
- [ ] T047 [P] Verify overall frontend coverage improved from baseline: `cd frontend && npm test -- --coverage`
- [ ] T048 [P] Verify test execution time <10 seconds: `cd frontend && time npm test -- src/services`
- [ ] T049 [P] Verify no console.log or debug statements in test files (code review)
- [ ] T050 [P] Run full linting on both test files: `cd frontend && npm run lint`
- [ ] T051 [P] Verify pre-commit hooks pass: `cd frontend && npm run lint && npm test`
- [ ] T052 Update coverage thresholds in frontend/jest.config.js to lock in coverage gains (optional)
- [ ] T053 Run quickstart validation from specs/007-service-layer-tests/quickstart.md

**Final Verification**:
```bash
cd frontend

# All tests pass
npm test
# Expected: All test suites pass

# Coverage improved
npm test -- --coverage
# Expected: Overall coverage > 44.97% (baseline)

# Fast execution
time npm test -- src/services
# Expected: <10 seconds

# Quality gates
npm run lint
npm run format:check
# Expected: No errors
```

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion
- **User Story 2 (Phase 3)**: Independent of User Story 1 - can run in parallel OR sequentially
- **Polish (Phase 4)**: Depends on both User Story 1 AND 2 completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent - tests only apiService.js
- **User Story 2 (P1)**: Independent - tests only socketService.js
- **No cross-dependencies**: Both stories can be implemented in parallel by different developers

### Within Each User Story

**User Story 1 (apiService tests)**:
1. T005 (file creation) MUST complete first
2. T006 (mock setup) MUST complete before test writing
3. T007-T013 (test writing) can run in parallel - marked [P]
4. T014-T019 (verification) run sequentially after all tests written

**User Story 2 (socketService tests)**:
1. T020-T022 (file/mock setup) MUST complete first
2. T023-T039 (test writing) can run in parallel - marked [P]
3. T040-T045 (verification) run sequentially after all tests written

### Parallel Opportunities

- **Setup Phase**: T001-T004 are independent file reads - can run in parallel (but fast enough to run sequentially)
- **User Story 1 Tests**: T007-T013 (all test writing) can run in parallel
- **User Story 2 Tests**: T023-T039 (all test writing) can run in parallel
- **Polish Phase**: T046-T051 can run in parallel (different quality checks)
- **Cross-Story Parallelism**: User Story 1 and User Story 2 can be worked on simultaneously by different developers

---

## Parallel Example: User Story 1

```bash
# After T005 and T006 complete, launch all test writing tasks together:
Task: "Write createPoll success test cases (CP-001, CP-002, CP-003)"
Task: "Write createPoll error test cases (CP-004, CP-005, CP-006, CP-007)"
Task: "Write createPoll error message handling tests (CP-008, CP-009)"
Task: "Write getPoll success test cases (GP-001, GP-002)"
Task: "Write getPoll error test cases (GP-003, GP-004, GP-005)"
Task: "Write getPoll error message handling tests (GP-006, GP-007)"
Task: "Write checkHealth test cases (CH-001, CH-002, CH-003, CH-004)"

# All 7 test writing tasks can execute in parallel - they write to different
# sections of the same file (describe blocks) with no conflicts
```

---

## Parallel Example: User Story 2

```bash
# After T020-T022 complete, launch all test writing tasks together:
Task: "Write module initialization tests (INIT-001, INIT-002, INIT-003)"
Task: "Write joinRoom tests (JR-001, JR-002, JR-003, JR-004)"
Task: "Write submitVote tests (SV-001, SV-002, SV-003, SV-004)"
Task: "Write changePollState tests (CPS-001, CPS-002, CPS-003)"
Task: "Write joinSocketRoom test (JSR-001, JSR-002)"
Task: "Write event listener registration tests (ON-001, ON-002, ON-003, ON-004)"
Task: "Write event listener cleanup tests (OFF-001, OFF-002, OFF-003, OFF-004)"
Task: "Write connection status callback tests (CS-001, CS-002, CS-003)"
Task: "Write reconnecting callback tests (RC-001, RC-002)"
Task: "Write getConnectionStatus tests (GCS-001, GCS-002)"
Task: "Write disconnect test (DC-001)"
Task: "Write connect event handler tests (CONN-001, CONN-002, CONN-003, CONN-004)"
Task: "Write disconnect event handler test (DISC-001)"
Task: "Write reconnecting event handler test (RECO-001)"
Task: "Write reconnect event handler test (RECS-001)"
Task: "Write reconnect_failed event handler test (RECF-001)"
Task: "Write edge case tests (multiple listeners, callback removal, etc.)"

# All 17 test writing tasks can execute in parallel - they write to different
# sections of the same file (describe blocks) with no conflicts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify infrastructure)
2. Complete Phase 2: User Story 1 (apiService tests)
3. **STOP and VALIDATE**:
   - Run `npm test -- apiService.test.js --coverage`
   - Verify ≥80% coverage
   - Verify all tests pass
4. Commit and push (MVP complete!)

**Deliverable**: apiService.js has comprehensive test coverage (0% → ≥80%)

### Incremental Delivery

1. Complete Setup → Infrastructure verified
2. Add User Story 1 → Test independently → Commit (MVP!)
3. Add User Story 2 → Test independently → Commit
4. Complete Polish Phase → Final validation → Commit

**Deliverables**:
- After US1: apiService.js tested (≥80% coverage)
- After US2: socketService.js tested (≥80% coverage)
- After Polish: Overall frontend coverage improved, all quality gates pass

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together (quick - just verification)
2. Once Setup done:
   - **Developer A**: User Story 1 (apiService tests) - T005-T019
   - **Developer B**: User Story 2 (socketService tests) - T020-T045
3. Both developers complete independently
4. Team completes Polish Phase together (T046-T053)

**Timeline Estimate**:
- Setup: 15 minutes (verification only)
- User Story 1: 3-4 hours (20 test cases)
- User Story 2: 4-5 hours (35-40 test cases)
- Polish: 30 minutes (quality checks)
- **Total (sequential)**: 7-9 hours
- **Total (parallel)**: 4-5 hours (with 2 developers)

---

## Notes

- **No implementation needed**: Service files already exist - we're only writing tests
- **TDD verification**: Tests validate existing code behavior - should all pass immediately
- **[P] tasks**: Different describe blocks in same file - can be written in parallel
- **[Story] labels**: [US1] for apiService, [US2] for socketService
- **Independent stories**: Either story can be completed without the other
- **Coverage focus**: Every task writing tests should reference specific test case IDs from contracts/
- **Quality gates**: Linting and formatting enforced by pre-commit hooks from feature #004
- **Reference pattern**: HostDashboard.test.js demonstrates proper mocking techniques
- **No breaking changes**: Tests validate existing service behavior - no service code modifications

---

## Test Case Reference

**User Story 1 Test Cases** (20 total):
- createPoll: CP-001 through CP-009 (9 tests)
- getPoll: GP-001 through GP-007 (7 tests)
- checkHealth: CH-001 through CH-004 (4 tests)

**User Story 2 Test Cases** (35-40 total):
- Module init: INIT-001 through INIT-003 (3 tests)
- joinRoom: JR-001 through JR-004 (4 tests)
- submitVote: SV-001 through SV-004 (4 tests)
- changePollState: CPS-001 through CPS-003 (3 tests)
- joinSocketRoom: JSR-001 through JSR-002 (2 tests)
- Event listeners: ON-001 through ON-004 (4 tests)
- Event cleanup: OFF-001 through OFF-004 (4 tests)
- Connection status: CS-001 through CS-003 (3 tests)
- Reconnecting: RC-001 through RC-002 (2 tests)
- getConnectionStatus: GCS-001 through GCS-002 (2 tests)
- disconnect: DC-001 (1 test)
- Event handlers: CONN-001 through RECF-001 (9 tests)
- Edge cases: 4+ tests

See contracts/ directory for detailed test case specifications.
