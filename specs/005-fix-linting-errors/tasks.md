---

description: "Task list for fixing 39 ESLint errors and warnings in frontend codebase"
---

# Tasks: Fix Linting Errors

**Input**: Design documents from `/specs/005-fix-linting-errors/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new tests required - existing test suite from feature #004 provides regression safety.

**Organization**: Tasks are organized by user story to enable independent implementation and validation of each quality improvement.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `frontend/src/`
- This feature only modifies frontend code

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies required for PropTypes validation

- [X] T001 Install prop-types package in frontend/package.json as production dependency
- [X] T002 Verify existing ESLint configuration in frontend/.eslintrc.js requires no changes
- [X] T003 Run npm run lint in frontend/ to establish baseline error count (should show 39 problems)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validations that must be complete before implementing fixes

**⚠️ CRITICAL**: Verify test suite passes before making any changes

- [X] T004 Run npm test in frontend/ to verify all existing tests pass (baseline)
- [X] T005 Document current linting errors by running npm run lint and capturing output

**Checkpoint**: Foundation verified - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Code Quality Compliance (Priority: P1) 🎯 MVP

**Goal**: Resolve all ESLint errors so CI/CD pipeline passes

**Independent Test**: Run `npm run lint` in frontend directory and verify 0 errors, 0 warnings

### Implementation for User Story 1

**Miscellaneous Code Quality Fixes (5 errors + 1 warning)**

- [X] T006 [P] [US1] Remove unused disconnect import in frontend/src/pages/HostDashboard.jsx
- [X] T007 [P] [US1] Remove unused disconnect import in frontend/src/pages/VotePage.jsx
- [X] T008 [P] [US1] Add explicit type="button" attribute to button element in frontend/src/components/PollControls.jsx line 30
- [X] T009 [P] [US1] Fix unescaped apostrophe entity in frontend/src/pages/JoinPage.jsx line 115
- [X] T010 [US1] Refactor for-of loop to array method in frontend/src/pages/HostDashboard.jsx line 119
- [X] T011 [US1] Break long line into multiple lines in frontend/src/services/socketService.js line 98

**Validation**

- [X] T012 [US1] Run npm run lint and verify miscellaneous errors are resolved
- [X] T013 [US1] Run npm test to verify no regressions from miscellaneous fixes

**Checkpoint**: Miscellaneous code quality issues resolved (6 problems → 0)

---

## Phase 4: User Story 2 - Accessibility Standards (Priority: P1)

**Goal**: Fix form label associations for screen reader users

**Independent Test**: Screen reader navigation through HostDashboard and JoinPage forms properly announces all labels

### Implementation for User Story 2

**Form Label Associations (4 errors)**

- [X] T014 [P] [US2] Add htmlFor and id attributes to form labels/inputs in frontend/src/pages/HostDashboard.jsx
- [X] T015 [P] [US2] Add htmlFor and id attributes to form labels/inputs in frontend/src/pages/JoinPage.jsx

**Validation**

- [X] T016 [US2] Run npm run lint and verify jsx-a11y/label-has-associated-control errors are resolved
- [X] T017 [US2] Run npm test to verify no regressions from accessibility fixes
- [X] T018 [US2] Manual test: Tab through forms and verify keyboard navigation works
- [X] T019 [US2] Optional: Test with screen reader to verify label announcements

**Checkpoint**: Accessibility compliance achieved (4 problems → 0)

---

## Phase 5: User Story 3 - Component Reliability (Priority: P2)

**Goal**: Add PropTypes validation to all components

**Independent Test**: Run application in dev mode and verify no PropTypes warnings in browser console

### Implementation for User Story 3

**PropTypes Validation (13 errors)**

- [X] T020 [P] [US3] Add PropTypes validation for count prop in frontend/src/components/ParticipantCounter.jsx
- [X] T021 [P] [US3] Add PropTypes validation for pollState, onOpenPoll, onClosePoll in frontend/src/components/PollControls.jsx
- [X] T022 [P] [US3] Add PropTypes validation for options, counts, percentages, pollState in frontend/src/components/PollResults.jsx

**Validation**

- [X] T023 [US3] Run npm run lint and verify react/prop-types errors are resolved
- [X] T024 [US3] Run npm test to verify no regressions from PropTypes additions
- [X] T025 [US3] Start dev server and verify no PropTypes warnings in browser console
- [X] T026 [US3] Manual test: Create poll, join poll, vote to verify all components render correctly

**Checkpoint**: PropTypes validation complete (13 problems → 0)

---

## Phase 6: User Story 4 - Production Code Cleanliness (Priority: P2)

**Goal**: Remove all debug console statements from production code

**Independent Test**: Search codebase for console.log and verify none exist in src/ files

### Implementation for User Story 4

**Console Statement Removal (15 warnings)**

- [X] T027 [P] [US4] Remove all 6 console.log statements from frontend/src/pages/HostDashboard.jsx
- [X] T028 [P] [US4] Remove all 9 console.log statements from frontend/src/services/socketService.js

**Validation**

- [X] T029 [US4] Run npm run lint and verify no-console warnings are resolved
- [X] T030 [US4] Run npm test to verify no regressions from console removal
- [X] T031 [US4] Build production bundle with npm run build and verify build succeeds
- [X] T032 [US4] Manual test: Run npm run preview and verify application functions without console output

**Checkpoint**: Production code cleanup complete (15 problems → 0)

---

## Phase 7: User Story 5 - React Best Practices (Priority: P3)

**Goal**: Replace array index keys with unique identifiers

**Independent Test**: Review list rendering and verify all keys use stable, unique identifiers

### Implementation for User Story 5

**Array Key Management (3 errors)**

- [X] T033 [P] [US5] Replace array index key with option text key in frontend/src/pages/HostDashboard.jsx line 198
- [X] T034 [P] [US5] Replace array index key with option text key in frontend/src/pages/VotePage.jsx line 196
- [X] T035 [P] [US5] Replace array index key with option text key in frontend/src/components/PollResults.jsx line 21

**Validation**

- [X] T036 [US5] Run npm run lint and verify react/no-array-index-key errors are resolved
- [X] T037 [US5] Run npm test to verify no regressions from key changes
- [X] T038 [US5] Manual test: Add, remove, reorder poll options and verify UI updates correctly

**Checkpoint**: React best practices implemented (3 problems → 0)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [X] T039 Run complete linting: npm run lint in frontend/ should show 0 errors, 0 warnings
- [X] T040 Run complete test suite: npm test in frontend/ should show all tests passing
- [X] T041 Run format check: npm run format:check in frontend/ should pass
- [X] T042 Verify quickstart.md validation steps all pass
- [X] T043 Review git diff to confirm only intended changes (8 files modified)
- [X] T044 Verify no console output in production build (npm run build && npm run preview)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Code Quality Compliance - Can proceed immediately after Foundational
  - User Story 2 (P1): Accessibility Standards - Can proceed immediately after Foundational
  - User Story 3 (P2): Component Reliability - Can proceed immediately after Foundational
  - User Story 4 (P2): Production Code Cleanliness - Can proceed immediately after Foundational
  - User Story 5 (P3): React Best Practices - Can proceed immediately after Foundational
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

All user stories are **completely independent** and can be implemented in parallel:

- **User Story 1 (P1)**: Code Quality - No dependencies on other stories
- **User Story 2 (P1)**: Accessibility - No dependencies on other stories
- **User Story 3 (P2)**: PropTypes - No dependencies on other stories (prop-types from Setup)
- **User Story 4 (P2)**: Console Removal - No dependencies on other stories
- **User Story 5 (P3)**: Array Keys - No dependencies on other stories

### Within Each User Story

- Implementation tasks marked [P] can run in parallel (different files)
- Validation tasks must run after all implementation tasks in that story complete
- Each story should be validated independently before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T001, T002, T003 can run sequentially (T001 must complete before T002)
- **User Story 1**: T006, T007, T008, T009 can all run in parallel (different files/lines)
- **User Story 2**: T014, T015 can run in parallel (different files)
- **User Story 3**: T020, T021, T022 can all run in parallel (different files)
- **User Story 4**: T027, T028 can run in parallel (different files)
- **User Story 5**: T033, T034, T035 can all run in parallel (different files/lines)
- **Cross-story parallelism**: After Foundational complete, ALL 5 user stories can start simultaneously

---

## Parallel Example: User Story 3 (PropTypes)

```bash
# Launch all PropTypes tasks together:
Task: "Add PropTypes validation for count prop in frontend/src/components/ParticipantCounter.jsx"
Task: "Add PropTypes validation for pollState, onOpenPoll, onClosePoll in frontend/src/components/PollControls.jsx"
Task: "Add PropTypes validation for options, counts, percentages, pollState in frontend/src/components/PollResults.jsx"

# After all complete, run validations:
Task: "Run npm run lint and verify react/prop-types errors are resolved"
Task: "Run npm test to verify no regressions from PropTypes additions"
```

---

## Implementation Strategy

### MVP First (Both P1 User Stories)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (verify baseline)
3. Complete Phase 3: User Story 1 (Code Quality)
4. Complete Phase 4: User Story 2 (Accessibility)
5. **STOP and VALIDATE**: Run `npm run lint` - should show significant progress
6. Continue if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation verified
2. Add User Story 1 → Validate independently (miscellaneous fixes)
3. Add User Story 2 → Validate independently (accessibility)
4. Add User Story 3 → Validate independently (PropTypes)
5. Add User Story 4 → Validate independently (console removal)
6. Add User Story 5 → Validate independently (array keys)
7. **Final validation**: `npm run lint` shows 0 errors, 0 warnings

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Code Quality) + User Story 2 (Accessibility)
   - Developer B: User Story 3 (PropTypes) + User Story 4 (Console)
   - Developer C: User Story 5 (Array Keys)
3. All stories complete independently, merge when all pass

### Single Developer Strategy (Recommended)

Priority order ensures blocking issues fixed first:

1. Setup + Foundational
2. User Story 1 (P1) - Code Quality - Quick wins (6 problems)
3. User Story 2 (P1) - Accessibility - Critical for WCAG compliance (4 problems)
4. User Story 3 (P2) - PropTypes - Improves reliability (13 problems)
5. User Story 4 (P2) - Console Removal - Production cleanliness (15 problems)
6. User Story 5 (P3) - Array Keys - Best practices (3 problems)
7. Polish - Final validation

---

## Notes

- [P] tasks = different files/lines, no dependencies within story
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Run `npm run lint` frequently to track progress
- Run `npm test` after each user story to catch regressions early
- Commit after each user story phase completes
- Total: 44 tasks resolving 39 linting problems across 8 files

## Task Count Summary

- **Setup**: 3 tasks
- **Foundational**: 2 tasks
- **User Story 1 (P1)**: 8 tasks (6 implementation + 2 validation)
- **User Story 2 (P1)**: 6 tasks (2 implementation + 4 validation)
- **User Story 3 (P2)**: 7 tasks (3 implementation + 4 validation)
- **User Story 4 (P2)**: 6 tasks (2 implementation + 4 validation)
- **User Story 5 (P3)**: 6 tasks (3 implementation + 3 validation)
- **Polish**: 6 tasks
- **TOTAL**: 44 tasks

## Parallel Execution Summary

- **Maximum parallelism**: After Foundational (T004-T005), all 5 user stories (Phases 3-7) can proceed simultaneously
- **Within-story parallelism**:
  - US1: 4 parallel tasks (T006-T009)
  - US2: 2 parallel tasks (T014-T015)
  - US3: 3 parallel tasks (T020-T022)
  - US4: 2 parallel tasks (T027-T028)
  - US5: 3 parallel tasks (T033-T035)
- **Total parallel opportunities**: 14 tasks can run simultaneously at peak

## Success Criteria

All success criteria from spec.md mapped to tasks:

- **SC-001**: `npm run lint` shows 0 errors, 0 warnings → Task T039
- **SC-002**: All 23 ESLint errors resolved → Tasks T006-T038
- **SC-003**: All 16 ESLint warnings resolved → Tasks T027-T028, T011
- **SC-004**: All existing tests pass → Tasks T013, T017, T024, T030, T037, T040
- **SC-005**: 0 label-association violations → Task T016
- **SC-006**: Code review confirms quality → Task T043
- **SC-007**: CI/CD linting passes → Task T039
