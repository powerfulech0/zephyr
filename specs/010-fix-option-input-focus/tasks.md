# Tasks: Fix Option Input Focus

**Input**: Design documents from `/specs/010-fix-option-input-focus/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Tests are included per Constitution Principle IV (Test-Driven Development)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- Paths adjusted based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and tooling ready for implementation

- [X] T001 Verify Node.js 18+ installed and frontend dependencies up to date
- [X] T002 Verify test infrastructure configured (Jest, @testing-library/react, @testing-library/jest-dom)
- [X] T003 [P] Verify ESLint and Prettier configured and working in frontend/

**Checkpoint**: Development environment ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks required - this is a bug fix in existing component

**⚠️ NOTE**: Skip this phase - existing HostDashboard component already implemented

**Checkpoint**: Foundation ready (already exists) - user story implementation can begin

---

## Phase 3: User Story 1 - Create Poll Options (Priority: P1) 🎯 MVP

**Goal**: Fix critical bug where typing in poll option fields loses focus after each character. Hosts should be able to type complete option text without interruption.

**Independent Test**: Create a new poll, click into any option field, type "Option One" continuously without clicking. All characters should appear without losing focus.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] [US1] Write unit test for focus maintenance on single character input in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T005 [P] [US1] Write unit test for focus maintenance on multiple consecutive characters (10+ chars) in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T006 [P] [US1] Write unit test for cursor position preservation when editing existing text in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T007 [US1] Run all tests and verify they FAIL (Red phase of TDD)

### Implementation for User Story 1

- [X] T008 [US1] Change key prop from `key={option || \`empty-option-${index}\`}` to `key={\`option-${index}\`}` in frontend/src/pages/HostDashboard.jsx line 190
- [X] T009 [US1] Run all tests and verify they PASS (Green phase of TDD)
- [X] T010 [US1] Run linting with `npm run lint` and fix any issues
- [X] T011 [US1] Run formatting with `npm run format` to ensure consistent style
- [X] T012 [US1] Manual test: Start dev server, create poll, type in option fields continuously

**Checkpoint**: User Story 1 complete - Basic typing in option fields works without focus loss

---

## Phase 4: User Story 2 - Edit Multiple Options Rapidly (Priority: P2)

**Goal**: Ensure smooth workflow when filling multiple option fields. Hosts should be able to quickly fill 3+ option fields with Tab navigation working correctly.

**Independent Test**: Create a poll with 3 options, fill each field completely ("Red", "Blue", "Green"), verify smooth transitions between fields with Tab key.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US2] Write unit test for Tab navigation between option fields in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T014 [P] [US2] Write unit test for rapid sequential typing across multiple fields in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T015 [P] [US2] Write unit test for keyboard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V) maintaining focus in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T016 [US2] Run all tests and verify new tests FAIL (Red phase of TDD)

### Implementation for User Story 2

- [X] T017 [US2] Verify existing implementation from US1 already supports multi-field workflow (no code changes needed)
- [X] T018 [US2] Run all tests and verify they PASS (Green phase of TDD)
- [X] T019 [US2] Manual test: Fill 3+ option fields with Tab navigation, verify smooth transitions

**Checkpoint**: User Story 2 complete - Multi-field workflow works smoothly

---

## Phase 5: Edge Cases & Polish

**Purpose**: Handle edge cases and ensure production readiness

### Edge Case Tests

- [X] T020 [P] Write test for paste text maintaining focus in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T021 [P] Write test for special characters and emoji maintaining focus in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T022 [P] Write test for adding new option field (5th field) doesn't affect existing keys in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T023 [P] Write test for removing option field re-indexes correctly in frontend/tests/unit/pages/HostDashboard.test.jsx
- [X] T024 Run all edge case tests and verify they PASS

### Integration & Quality

- [X] T025 Run existing integration tests with `npm test` to ensure no regressions in frontend/tests/integration/HostDashboard.integration.test.jsx
- [X] T026 Run full test suite with coverage: `npm test -- --coverage`
- [X] T027 Verify test coverage meets project standards (≥90% for changed code)
- [X] T028 [P] Run linting: `npm run lint` (should show zero errors)
- [X] T029 [P] Run formatting check: `npm run format:check` (should show zero issues)
- [X] T030 [P] Run security scan: `npm audit` (resolve any high/critical issues)

### Manual Validation

- [X] T031 Execute manual validation from quickstart.md Step 1: Test P1 (single field typing)
- [X] T032 Execute manual validation from quickstart.md Step 2: Test P2 (multi-field workflow)
- [X] T033 Execute manual validation from quickstart.md Step 4: Create poll end-to-end
- [X] T034 Test on mobile browser (Chrome/Safari) to verify virtual keyboard behavior
- [X] T035 Test with screen reader to verify accessibility unchanged

### Documentation

- [X] T036 Update any inline code comments if needed in frontend/src/pages/HostDashboard.jsx
- [X] T037 Verify quickstart.md validation steps match actual behavior

**Checkpoint**: All edge cases handled, quality checks passed, ready for commit

---

## Phase 6: Commit & Deploy

**Purpose**: Create commit following project conventions and prepare for deployment

- [X] T038 Stage changes: `git add frontend/src/pages/HostDashboard.jsx frontend/tests/unit/pages/HostDashboard.test.jsx`
- [X] T039 Run pre-commit hooks (should trigger automatically): linting, formatting, related tests
- [X] T040 Verify all tests pass one final time: `npm test`
- [X] T041 Create commit with message following project conventions (includes Fixes #29, co-authored-by Claude)
- [X] T042 Push branch: `git push origin 010-fix-option-input-focus`
- [X] T043 Create pull request with `gh pr create --title "Fix option input focus bug" --body "Fixes #29"`

**Checkpoint**: Changes committed and PR created

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Skipped - existing component
- **User Story 1 (Phase 3)**: Depends on Setup completion - MVP story
- **User Story 2 (Phase 4)**: Depends on US1 completion (verifies fix works for multi-field)
- **Edge Cases (Phase 5)**: Depends on US1 and US2 completion
- **Commit (Phase 6)**: Depends on all previous phases completion

### User Story Dependencies

- **User Story 1 (P1)**: Independent - Core bug fix
- **User Story 2 (P2)**: Builds on US1 - Verifies multi-field workflow works with fix

### Within Each User Story

1. Write tests FIRST (T004-T006 for US1, T013-T015 for US2)
2. Verify tests FAIL (T007 for US1, T016 for US2)
3. Implement fix (T008 for US1, T017 for US2)
4. Verify tests PASS (T009 for US1, T018 for US2)
5. Run quality checks (T010-T011 for US1, T019 for US2)
6. Manual validation

### Parallel Opportunities

**Setup Phase (Phase 1):**
- T002 and T003 can run in parallel (different verifications)

**User Story 1 Tests (Phase 3):**
- T004, T005, T006 can be written in parallel (different test files/cases)

**User Story 2 Tests (Phase 4):**
- T013, T014, T015 can be written in parallel (different test cases)

**Edge Case Tests (Phase 5):**
- T020, T021, T022, T023 can be written in parallel (independent edge cases)
- T028, T029, T030 can run in parallel (different quality checks)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit test for focus maintenance on single character input"
Task: "Write unit test for focus maintenance on multiple consecutive characters"
Task: "Write unit test for cursor position preservation when editing existing text"
```

## Parallel Example: Edge Case Tests

```bash
# Launch all edge case tests together:
Task: "Write test for paste text maintaining focus"
Task: "Write test for special characters and emoji maintaining focus"
Task: "Write test for adding new option field"
Task: "Write test for removing option field"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 3: User Story 1 (T004-T012)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. If validated, can deploy/demo MVP

### Incremental Delivery

1. Complete Setup → Environment ready
2. Add User Story 1 → Test independently → MVP ready (basic typing works)
3. Add User Story 2 → Test independently → Full workflow validated
4. Add Edge Cases → Test independently → Production ready
5. Commit and deploy

### Sequential Implementation (Single Developer)

**Estimated Time: 20-25 minutes total**

1. **Phase 1 (2 min)**: Verify environment
2. **Phase 3 US1 Tests (5 min)**: Write T004-T006, run T007 (should fail)
3. **Phase 3 US1 Implementation (3 min)**: Change one line (T008), run tests (T009), quality checks (T010-T011), manual test (T012)
4. **Phase 4 US2 Tests (3 min)**: Write T013-T015, run T016 (should fail)
5. **Phase 4 US2 Verification (2 min)**: Verify fix works (T017-T019)
6. **Phase 5 Edge Cases (8 min)**: Write edge case tests (T020-T024), run integration/quality checks (T025-T030), manual validation (T031-T037)
7. **Phase 6 Commit (2 min)**: Stage, commit, push, PR (T038-T043)

---

## Notes

- **TDD Required**: All tests must be written BEFORE implementation and FAIL before code changes
- **Constitution Compliance**: Following Principle IV (Test-Driven Development) strictly
- **[P] tasks**: Can run in parallel (different files, no dependencies)
- **[Story] label**: Maps task to specific user story for traceability
- **Single-line fix**: T008 is the only production code change needed
- **Minimal change**: No refactoring, no additional features, just bug fix
- **Pre-commit hooks**: Automatically run linting, formatting, and related tests before commit
- **Success criteria**: All tests pass, manual validation succeeds, SC-001 through SC-004 met
- Avoid: scope creep, additional refactoring, breaking existing functionality
