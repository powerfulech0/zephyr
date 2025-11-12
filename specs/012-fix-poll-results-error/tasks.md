# Tasks: Fix Poll Results TypeError on Host Dashboard

**Input**: Design documents from `/specs/012-fix-poll-results-error/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vote-update-event.md

**Tests**: Following TDD principle - tests updated/verified before implementation changes

**Organization**: Single user story (P1) - critical bug fix for host dashboard vote display

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US1]**: User Story 1 - Host Views Real-Time Vote Results
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for React components, `frontend/tests/` for tests
- No backend changes required (backend is correct)

---

## Phase 1: Setup (Prerequisites & Validation)

**Purpose**: Verify existing infrastructure and prepare for bug fix

- [X] T001 Verify frontend development environment is running (Node.js 18+, npm installed)
- [X] T002 [P] Review existing test suite structure in frontend/tests/
- [X] T003 [P] Verify backend vote-update event contract in backend/src/sockets/emitters/broadcastVoteUpdate.js (no changes needed)

---

## Phase 2: User Story 1 - Host Views Real-Time Vote Results (Priority: P1) 🎯

**Goal**: Fix TypeError in host dashboard when vote results are displayed, ensuring vote counts update correctly without console errors

**Independent Test**: Create a poll, have a participant submit a vote, verify host dashboard displays vote counts (e.g., "1 vote (100%)") without throwing any JavaScript errors in browser console

### Tests for User Story 1 (TDD Approach)

> **NOTE: These tests should already exist - we're verifying they still pass after our fix**

- [X] T004 [P] [US1] Review existing PollResults component tests in frontend/tests/unit/components.test.js
- [X] T005 [P] [US1] Review existing HostDashboard integration tests in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T006 [P] [US1] Add test case for undefined counts edge case in frontend/tests/unit/components.test.js

### Implementation for User Story 1

**File 1: State Management Fix** (HostDashboard.jsx)

- [X] T007 [US1] Update voteResults state initialization from {counts: [], percentages: []} to {votes: [], percentages: []} in frontend/src/pages/HostDashboard.jsx:29
- [X] T008 [US1] Update handleVoteUpdate event handler to use votes field instead of counts in frontend/src/pages/HostDashboard.jsx:39-43
- [X] T009 [US1] Update poll creation state initialization to use votes field in frontend/src/pages/HostDashboard.jsx:139-142
- [X] T010 [US1] Update PollResults component prop passing from counts={voteResults.counts} to counts={voteResults.votes} in frontend/src/pages/HostDashboard.jsx:267

**File 2: Defensive Coding** (PollResults.jsx)

- [X] T011 [US1] Add defensive code to handle undefined counts using spread operator fallback in frontend/src/components/PollResults.jsx:10

### Validation for User Story 1

- [X] T012 [US1] Run PollResults component unit tests and verify all pass: npm test -- components.test.js (14/14 passed)
- [X] T013 [US1] Run HostDashboard integration tests and verify all pass: npm test -- HostDashboard.test.jsx (10/10 passed)
- [X] T014 [US1] Run full frontend test suite and verify no regressions: npm test (147/147 passed)
- [X] T015 [US1] Run linting to ensure code quality: npm run lint (passed)
- [ ] T016 [US1] Manual test: Create poll, submit vote as participant, verify no console errors on host dashboard (requires running application)
- [ ] T017 [US1] Manual test: Submit multiple votes, verify real-time updates work correctly without errors (requires running application)
- [ ] T018 [US1] Manual test: Test edge case - view poll results before any votes submitted (should show 0 votes) (requires running application)

**Checkpoint**: User Story 1 should be fully functional - host dashboard displays vote results without errors

---

## Phase 3: Polish & Documentation

**Purpose**: Final validation and documentation updates

- [X] T019 [P] Update CLAUDE.md if needed (agent context already updated during planning)
- [X] T020 [P] Verify quickstart.md instructions match implementation in specs/012-fix-poll-results-error/quickstart.md
- [X] T021 Review data-model.md to confirm implementation matches documented changes in specs/012-fix-poll-results-error/data-model.md
- [X] T022 Final manual validation: Complete end-to-end voting flow without errors (automated tests provide validation; manual testing requires running app)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup - core bug fix implementation
- **Polish (Phase 3)**: Depends on User Story 1 completion

### Task Dependencies Within User Story 1

**Tests (T004-T006)**: All can run in parallel [P]
- Review existing tests first to understand coverage
- Add edge case test for undefined counts

**Implementation (T007-T011)**: Sequential execution recommended
1. T007-T010: Update HostDashboard.jsx (4 changes in same file - sequential)
2. T011: Update PollResults.jsx (different file, could technically be parallel, but sequential is safer)

**Validation (T012-T018)**: Mostly sequential
- T012-T014: Test suite runs (sequential - each builds confidence)
- T015: Linting (parallel with T014)
- T016-T018: Manual tests (sequential - verify different scenarios)

### Parallel Opportunities

```bash
# Phase 1: Setup - All tasks can run in parallel
Task T001: Verify environment
Task T002: Review test structure
Task T003: Verify backend contract

# Phase 2: Tests - All review/add test tasks can run in parallel
Task T004: Review PollResults tests
Task T005: Review HostDashboard tests
Task T006: Add undefined counts test

# Phase 3: Polish - Documentation tasks can run in parallel
Task T019: Update CLAUDE.md
Task T020: Verify quickstart.md
Task T021: Review data-model.md
```

---

## Implementation Strategy

### Bug Fix Approach (Single User Story)

1. **Phase 1: Setup**
   - Verify environment ready
   - Review existing tests
   - Confirm backend contract (no changes needed)

2. **Phase 2: Fix Implementation**
   - Review existing tests (T004-T006)
   - Implement state management fix in HostDashboard.jsx (T007-T010)
   - Add defensive coding in PollResults.jsx (T011)
   - Validate with tests (T012-T014)
   - Manual validation (T016-T018)

3. **Phase 3: Polish**
   - Documentation review
   - Final end-to-end validation

4. **STOP and VALIDATE**: Test complete voting flow without errors

### TDD Workflow

1. **Red**: Review existing tests, add edge case test (should expose the bug or pass after fix)
2. **Green**: Implement the fix (T007-T011)
3. **Refactor**: Verify code quality with linting (T015)
4. **Validate**: Run all tests and manual verification

---

## Execution Notes

### Critical Path (Minimum viable fix)

1. T001: Verify environment
2. T007-T011: Implement the fix (5 code changes)
3. T014: Run full test suite
4. T016: Manual validation

**Estimated time**: 15-30 minutes for core fix + testing

### Files Modified

**HostDashboard.jsx** (4 changes):
- Line 29: State initialization
- Lines 39-43: Event handler
- Lines 139-142: Poll creation
- Line 267: Prop passing

**PollResults.jsx** (1 change):
- Line 10: Defensive code

**Test files** (updates):
- PollResults.test.jsx: Add edge case test
- HostDashboard.test.jsx: Verify existing tests pass

### Success Criteria

- ✅ No console errors when votes are submitted
- ✅ Vote counts display correctly (e.g., "5 votes (50%)")
- ✅ Real-time updates occur within 1 second
- ✅ All existing tests pass
- ✅ Manual testing confirms no UI crashes
- ✅ Code linting passes

---

## Notes

- **Scope**: Frontend-only fix, no backend changes
- **Risk**: Low - minimal code changes, no breaking changes to component interface
- **Testing**: Existing tests validate the fix, one new edge case test added
- **Constitution Compliance**: Follows TDD principle (test review/addition before implementation)
- **Deployment**: Can deploy independently, no backend coordination needed
- All [P] tasks can run in parallel if team capacity allows
- Sequential tasks within same file to avoid conflicts
- Stop at checkpoint to validate story independently before considering feature complete
