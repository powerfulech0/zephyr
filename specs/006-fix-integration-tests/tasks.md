# Tasks: Fix Failing Integration Tests

**Input**: Design documents from `/specs/006-fix-integration-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature fixes existing tests, so no new test creation is required. Tests already exist and are failing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- This feature only modifies frontend files

---

## Phase 1: Setup (Validation & Baseline)

**Purpose**: Establish baseline test failures and validate environment

- [x] T001 Run integration tests to reproduce all 3 failing tests in `frontend/tests/integration/userFlows.test.js`
- [x] T002 Verify socket service mock file exists at `frontend/src/services/__mocks__/socketService.js`
- [x] T003 Verify PollControls component exists at `frontend/src/components/PollControls.jsx`

---

## Phase 2: Foundational (N/A)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**No foundational tasks required** - This is a bug fix to existing infrastructure. All dependencies are already installed and configured from feature #004.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fix Socket Service Mock (Priority: P1)

**Goal**: Ensure socket service mock exports `joinSocketRoom` function to match real service interface, allowing integration tests to call this function without errors.

**Independent Test**: Run `cd frontend && npm test -- tests/integration/userFlows.test.js --testNamePattern="Host Poll Control Flow"` and verify the test passes without "joinSocketRoom is not a function" errors.

### Implementation for User Story 1

- [x] T004 [US1] Verify `joinSocketRoom` is exported in `frontend/src/services/__mocks__/socketService.js` (line 2)
- [x] T005 [US1] Review integration test at `frontend/tests/integration/userFlows.test.js:209-248` to understand how `joinSocketRoom` should be called
- [x] T006 [US1] If mock is correctly exported but tests fail, investigate test setup in `frontend/tests/integration/userFlows.test.js:14-25` to ensure mock is properly imported
- [x] T007 [US1] Run host poll control flow test to verify fix: `cd frontend && npm test -- tests/integration/userFlows.test.js --testNamePattern="Host Poll Control Flow"`

**Success Criteria**:
- ✅ `joinSocketRoom` function exists in mock and is callable
- ✅ Host Poll Control Flow test passes
- ✅ No "joinSocketRoom is not a function" errors

**Checkpoint**: Socket service mock is complete and host poll control flow test passes

---

## Phase 4: User Story 2 - Fix Component Rendering Issues (Priority: P1)

**Goal**: Ensure components render properly in integration tests so that DOM elements can be found and tested for correct behavior.

**Independent Test**: Run `cd frontend && npm test -- tests/integration/userFlows.test.js` and verify no "Unable to find elements, DOM is empty" errors appear.

### Implementation for User Story 2

- [x] T008 [US2] Investigate HostDashboard component state initialization in `frontend/src/pages/HostDashboard.jsx`
- [x] T009 [US2] Review integration test setup in `frontend/tests/integration/userFlows.test.js:209-248` for proper async handling
- [x] T010 [US2] Add debug output if needed to inspect rendered HTML in failing test (temporary, can be removed after fix)
- [x] T011 [US2] Ensure all async operations in test use `waitFor` from @testing-library/react
- [x] T012 [US2] Verify HostDashboard provides valid initial state for PollControls component after poll creation
- [x] T013 [US2] Run integration tests to verify component rendering: `cd frontend && npm test -- tests/integration/userFlows.test.js`

**Success Criteria**:
- ✅ Components render with expected DOM elements
- ✅ No "Unable to find elements, DOM is empty" errors
- ✅ All `screen.getByText()` and `screen.getByLabelText()` queries succeed

**Checkpoint**: Components render correctly and all DOM elements are queryable in tests

---

## Phase 5: User Story 3 - Add Defensive Null Checks (Priority: P1)

**Goal**: Ensure PollControls component handles undefined/null pollState gracefully to prevent TypeError crashes in tests and production.

**Independent Test**: Run `cd frontend && npm test -- tests/integration/userFlows.test.js` and verify no "Cannot read properties of undefined (reading 'toUpperCase')" errors appear.

### Implementation for User Story 3

- [x] T014 [US3] Update PollControls PropTypes in `frontend/src/components/PollControls.jsx` line 49 to make pollState optional (change from `PropTypes.string.isRequired` to `PropTypes.string`)
- [x] T015 [US3] Verify defensive coding already exists in `frontend/src/components/PollControls.jsx` line 42 (`pollState?.toUpperCase() || 'UNKNOWN'`)
- [x] T016 [US3] Verify default case in switch statement at `frontend/src/components/PollControls.jsx` line 21 handles undefined pollState
- [x] T017 [US3] Run integration tests to verify defensive null handling: `cd frontend && npm test -- tests/integration/userFlows.test.js`

**Success Criteria**:
- ✅ PollControls PropTypes allows undefined pollState
- ✅ Component handles undefined pollState without errors
- ✅ No "Cannot read properties of undefined" errors
- ✅ No PropTypes warnings in test output

**Checkpoint**: PollControls handles all possible pollState values (waiting, open, closed, undefined, null) gracefully

---

## Phase 6: Polish & Validation

**Purpose**: Verify all fixes work together and no regressions introduced

- [x] T018 Run full integration test suite: `cd frontend && npm test -- tests/integration/userFlows.test.js`
- [x] T019 Run full frontend test suite to verify no regressions: `cd frontend && npm test`
- [x] T020 [P] Verify test coverage maintained or improved: `cd frontend && npm test -- --coverage`
- [x] T021 [P] Run linting to ensure code quality: `cd frontend && npm run lint`
- [x] T022 [P] Run formatting to ensure consistent style: `cd frontend && npm run format`
- [x] T023 Verify no console errors or warnings in test output
- [x] T024 Run quickstart validation commands from `specs/006-fix-integration-tests/quickstart.md`

**Success Criteria**:
- ✅ All 8 integration tests pass (8/8)
- ✅ All frontend tests pass (all test suites)
- ✅ Test coverage ≥ previous level
- ✅ Linting passes with zero errors
- ✅ Formatting applied consistently
- ✅ No console errors or PropTypes warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - No foundational tasks needed
- **User Stories (Phase 3-5)**: All three user stories are independent and can be implemented in parallel or sequentially
  - User Story 1 (Socket Mock): Independent - fixes mock exports
  - User Story 2 (Component Rendering): Independent - fixes component initialization
  - User Story 3 (Null Checks): Independent - fixes component PropTypes
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Phase 1 - No dependencies on other stories
- **User Story 2 (P1)**: Can start immediately after Phase 1 - No dependencies on other stories
- **User Story 3 (P1)**: Can start immediately after Phase 1 - No dependencies on other stories

**Note**: All three user stories are P1 priority and can be worked on in parallel since they modify different aspects:
- US1: Mock file
- US2: Component rendering/initialization
- US3: Component PropTypes

### Within Each User Story

- US1: Sequential investigation → verification → test
- US2: Investigation → fix → verification
- US3: PropTypes update → verification

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- All three user stories (Phase 3, 4, 5) can be implemented in parallel by different developers
- All Polish tasks marked [P] (T020, T021, T022) can run in parallel

---

## Parallel Example: All User Stories

```bash
# All three user stories can be launched together since they touch different files:

# Developer A (or parallel agent):
Task: "Verify joinSocketRoom is exported in frontend/src/services/__mocks__/socketService.js"
Task: "Run host poll control flow test"

# Developer B (or parallel agent):
Task: "Investigate HostDashboard component state initialization"
Task: "Ensure proper async handling in tests"

# Developer C (or parallel agent):
Task: "Update PollControls PropTypes in frontend/src/components/PollControls.jsx"
Task: "Verify defensive coding exists"
```

---

## Implementation Strategy

### MVP First (All User Stories - All P1)

Since all three user stories are P1 priority and blocking test execution:

1. Complete Phase 1: Setup (establish baseline failures)
2. Complete Phase 3, 4, 5 in parallel OR sequentially:
   - **Sequential approach** (recommended for single developer):
     - Fix User Story 1 → Verify socket mock works
     - Fix User Story 2 → Verify rendering works
     - Fix User Story 3 → Verify null handling works
   - **Parallel approach** (if multiple developers):
     - Developer A: User Story 1
     - Developer B: User Story 2
     - Developer C: User Story 3
3. Complete Phase 6: Polish & Validation
4. **STOP and VALIDATE**: All 3 tests should now pass

### Incremental Delivery

1. Complete Setup → Baseline established
2. Fix User Story 1 → Test socket mock independently
3. Fix User Story 2 → Test rendering independently
4. Fix User Story 3 → Test null handling independently
5. Run full test suite → All tests pass
6. Polish & validate → Ready to merge

### Single Developer Strategy (Recommended)

1. Run baseline tests (T001) to see all failures
2. Fix easiest issue first (US3 - PropTypes change is 1 line)
3. Fix socket mock (US1 - likely just verification needed)
4. Fix rendering issue (US2 - may require investigation)
5. Validate all fixes together
6. Polish and commit

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable
- This is a bug fix, so tests already exist - no new test creation needed
- Verify each fix independently before moving to next story
- Commit after each user story is complete
- All three user stories must be complete for the feature to be done
- Avoid: Creating new tests, refactoring test structure (out of scope)

---

## Success Metrics

**Before Fix**:
- 3 integration tests failing in `userFlows.test.js`
- Errors: "joinSocketRoom is not a function", "Unable to find elements", "Cannot read properties of undefined"

**After Fix**:
- 0 integration test failures
- All 8 tests in `userFlows.test.js` pass
- Full frontend test suite passes
- No console errors or warnings
- Test coverage maintained or improved

**Total Tasks**: 24 tasks across 6 phases
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 0 tasks (N/A)
- Phase 3 (US1): 4 tasks
- Phase 4 (US2): 6 tasks
- Phase 5 (US3): 4 tasks
- Phase 6 (Polish): 7 tasks

**Estimated Effort**: Low (simple bug fixes, mostly verification and 1-line changes)
