# Tasks: Frontend Test Infrastructure and Quality Tooling

**Input**: Design documents from `/specs/004-frontend-test-infrastructure/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/npm-scripts.md, quickstart.md

**Tests**: This feature establishes test infrastructure itself. Test tasks focus on creating retrospective tests for feature #003 bug (User Story 3).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `frontend/` directory contains all frontend code
- Test files: `frontend/tests/contract/`, `frontend/tests/unit/`
- Configuration: `frontend/jest.config.js`, `frontend/.eslintrc.js`, `frontend/.prettierrc`
- Pre-commit hooks: `.husky/pre-commit` (repository root)
- CI configuration: `.github/workflows/test.yml` (repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create directory structure for test infrastructure

- [x] T001 Install Jest and React Testing Library dev dependencies in frontend/package.json
- [x] T002 [P] Install identity-obj-proxy for CSS mocking in frontend/package.json
- [x] T003 [P] Create test directory structure: frontend/tests/contract/, frontend/tests/unit/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure configuration that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Jest configuration file in frontend/jest.config.js with jsdom environment
- [x] T005 Create test setup file in frontend/tests/setup.js with @testing-library/jest-dom
- [x] T006 Configure CSS module mocking in frontend/jest.config.js moduleNameMapper
- [x] T007 Set coverage thresholds to 80% for all metrics in frontend/jest.config.js
- [x] T008 Exclude main.jsx from coverage collection in frontend/jest.config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Writes Tests for New Features (Priority: P1) 🎯 MVP

**Goal**: Enable developers to run tests, verify React component testing works, and have tests execute in under 30 seconds with coverage

**Independent Test**: Run `npm test` in frontend directory and verify that tests execute successfully with coverage report displayed

### Implementation for User Story 1

- [x] T009 [P] [US1] Add "test" script to frontend/package.json that runs jest --coverage
- [x] T010 [P] [US1] Add "test:watch" script to frontend/package.json that runs jest --watch
- [x] T011 [P] [US1] Add "test:ci" script to frontend/package.json that runs jest --coverage --ci --maxWorkers=2
- [x] T012 [US1] Create placeholder .gitkeep file in frontend/tests/unit/ for future unit tests
- [x] T013 [US1] Verify npm test runs successfully and displays "no tests found" message (not error)
- [x] T014 [US1] Verify npm run test:watch enters watch mode successfully
- [x] T015 [US1] Verify test execution performance meets <30 second target

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can run tests with coverage

---

## Phase 4: User Story 2 - Developer Ensures Code Quality Standards (Priority: P1) 🎯 MVP

**Goal**: Enable developers to run linting and formatting commands, integrate with pre-commit hooks

**Independent Test**: Run `npm run lint` and `npm run format` commands and verify they analyze and format the codebase correctly

### Implementation for User Story 2

- [x] T016 [P] [US2] Add "lint" script to frontend/package.json that runs eslint src --ext .js,.jsx --report-unused-disable-directives --max-warnings 0
- [x] T017 [P] [US2] Add "lint:fix" script to frontend/package.json that runs eslint src --ext .js,.jsx --fix
- [x] T018 [P] [US2] Add "format" script to frontend/package.json that runs prettier --write 'src/**/*.{js,jsx,css}'
- [x] T019 [P] [US2] Add "format:check" script to frontend/package.json that runs prettier --check 'src/**/*.{js,jsx,css}'
- [x] T020 [US2] Verify frontend/.eslintrc.js exists and is valid configuration
- [x] T021 [US2] Verify frontend/.prettierrc exists and is valid configuration
- [x] T022 [US2] Run npm run lint on existing code and verify zero errors
- [x] T023 [US2] Run npm run format on existing code and verify successful formatting
- [x] T024 [US2] Update .husky/pre-commit to include frontend lint and format checks
- [x] T025 [US2] Test pre-commit hook by staging a file and attempting commit
- [x] T026 [US2] Verify linting and formatting meet performance targets (<10s and <5s)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - tests and quality tools functional

---

## Phase 5: User Story 3 - Developer Writes Retrospective Tests for Bug Fixes (Priority: P2)

**Goal**: Create contract tests that verify the bug fix from feature #003 and prevent regression

**Independent Test**: Examine frontend/tests/contract/HostDashboard.test.js and run it to verify it catches the specific bug from feature #003

### Tests for User Story 3 (Retrospective Contract Tests)

> **NOTE: These tests verify existing bug fix from feature #003**

- [x] T027 [US3] Create test file frontend/tests/contract/HostDashboard.test.js with test structure
- [x] T028 [US3] Add test: "setPoll receives API response directly (not response.data)" in frontend/tests/contract/HostDashboard.test.js
- [x] T029 [US3] Add test: "setPollState receives response.state correctly" in frontend/tests/contract/HostDashboard.test.js
- [x] T030 [US3] Add test: "joinSocketRoom receives response.roomCode correctly" in frontend/tests/contract/HostDashboard.test.js
- [x] T031 [US3] Mock API service module in HostDashboard.test.js to return test response data
- [x] T032 [US3] Verify all retrospective tests pass with npm test
- [x] T033 [US3] Verify tests would fail if bug were reintroduced (manually test by reverting fix temporarily)
- [x] T034 [US3] Verify coverage report shows HostDashboard.jsx is covered

**Checkpoint**: All retrospective tests pass and protect against regression of bug #003

---

## Phase 6: User Story 4 - CI/CD Pipeline Validates Quality (Priority: P3)

**Goal**: Integrate frontend tests and quality checks into GitHub Actions CI pipeline

**Independent Test**: Push a branch to GitHub and verify that the CI pipeline runs frontend tests and linting automatically

### Implementation for User Story 4

- [x] T035 [US4] Add frontend-tests job to .github/workflows/test.yml
- [x] T036 [US4] Configure frontend-tests job with Node.js 18 setup and npm ci for frontend
- [x] T037 [US4] Add "Run linting" step to frontend-tests job that runs cd frontend && npm run lint
- [x] T038 [US4] Add "Run tests" step to frontend-tests job that runs cd frontend && npm run test:ci
- [x] T039 [US4] Add "Check formatting" step to frontend-tests job that runs cd frontend && npm run format:check
- [x] T040 [US4] Configure coverage upload step with codecov/codecov-action@v3 for frontend coverage
- [x] T041 [US4] Push branch to GitHub and verify frontend-tests job runs in Actions
- [ ] T042 [US4] Verify CI fails if tests fail (test by temporarily breaking a test) - DEFERRED: Requires monitoring GitHub Actions
- [ ] T043 [US4] Verify CI fails if linting fails (test by temporarily adding lint error) - DEFERRED: Requires monitoring GitHub Actions
- [ ] T044 [US4] Verify CI passes when all checks succeed - DEFERRED: Requires monitoring GitHub Actions

**Checkpoint**: All user stories should now be independently functional - CI validates quality automatically

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final verification

- [x] T045 [P] Update CLAUDE.md with frontend testing commands if not already done by update-agent-context.sh
- [x] T046 Run specs/004-frontend-test-infrastructure/quickstart.md validation steps
- [x] T047 Verify all success criteria from spec.md are met
- [ ] T048 [P] Document test infrastructure usage in frontend/README.md if needed (deferred - not critical for MVP)
- [x] T049 Verify performance benchmarks: tests <30s, lint <10s, format <5s

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Core test infrastructure - highest priority
  - User Story 2 (P1): Quality tooling - highest priority, independent of US1
  - User Story 3 (P2): Retrospective tests - depends on US1 (needs test runner)
  - User Story 4 (P3): CI integration - depends on US1 and US2 (needs working tests and lint)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1, can run in parallel
- **User Story 3 (P2)**: Requires US1 complete (needs test runner to run contract tests)
- **User Story 4 (P3)**: Requires US1 and US2 complete (needs working tests and linting for CI)

### Within Each User Story

- **US1**: All npm script additions are parallel (T009-T011), verification tasks run after scripts added
- **US2**: All npm script additions are parallel (T016-T019), verification tasks run after scripts added
- **US3**: Test creation tasks can be parallel if writing different test functions
- **US4**: CI configuration steps are sequential (must configure job before testing it)

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel (installing dependencies vs creating directories)
- **Phase 3 (US1)**: T009, T010, T011 can run in parallel (adding different npm scripts)
- **Phase 4 (US2)**: T016, T017, T018, T019 can run in parallel (adding different npm scripts)
- **Phase 7**: T045 and T048 can run in parallel (documentation updates)
- **User Stories**: US1 and US2 can be implemented in parallel after Foundational phase complete

---

## Parallel Example: User Story 1 (Test Infrastructure)

```bash
# Launch all npm script additions for User Story 1 together:
Task: "Add 'test' script to frontend/package.json that runs jest --coverage"
Task: "Add 'test:watch' script to frontend/package.json that runs jest --watch"
Task: "Add 'test:ci' script to frontend/package.json that runs jest --coverage --ci --maxWorkers=2"

# Then run verification tasks sequentially:
Task: "Verify npm test runs successfully"
Task: "Verify npm run test:watch enters watch mode"
Task: "Verify test execution performance meets <30 second target"
```

---

## Parallel Example: User Story 2 (Quality Tooling)

```bash
# Launch all npm script additions for User Story 2 together:
Task: "Add 'lint' script to frontend/package.json"
Task: "Add 'lint:fix' script to frontend/package.json"
Task: "Add 'format' script to frontend/package.json"
Task: "Add 'format:check' script to frontend/package.json"

# Then run verification tasks sequentially:
Task: "Verify frontend/.eslintrc.js exists"
Task: "Run npm run lint on existing code"
Task: "Update .husky/pre-commit"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 - Both P1)

This feature has TWO P1 user stories that together form the MVP:

1. Complete Phase 1: Setup (install dependencies, create directories)
2. Complete Phase 2: Foundational (Jest config, test setup)
3. Complete Phase 3: User Story 1 (test runner infrastructure)
4. Complete Phase 4: User Story 2 (linting and formatting)
5. **STOP and VALIDATE**: Test both US1 and US2 independently
6. At this point, developers can write and run tests, lint, and format code (constitutional compliance achieved)

### Incremental Delivery

1. **MVP** (US1 + US2): Test and quality infrastructure → Constitutional compliance ✅
2. **Add US3**: Retrospective tests for bug #003 → Regression protection ✅
3. **Add US4**: CI integration → Team quality gates ✅
4. Each story adds value without breaking previous stories

### Sequential Team Strategy (Recommended)

Due to tight integration of tasks:

1. Complete Setup + Foundational together (required for all)
2. Implement US1 and US2 sequentially or in parallel (both P1, independent)
3. Implement US3 after US1 complete (needs test runner)
4. Implement US4 after US1 and US2 complete (needs tests and linting)
5. Polish and validate

### Parallel Team Strategy (If Multiple Developers)

With two developers:

1. **Both**: Complete Setup + Foundational together
2. **Developer A**: Implement User Story 1 (test infrastructure)
3. **Developer B**: Implement User Story 2 (quality tooling) in parallel with A
4. **Developer A** (after US1 complete): Implement User Story 3 (retrospective tests)
5. **Developer B** (after US1 and US2 complete): Implement User Story 4 (CI integration)
6. **Both**: Polish and validate

---

## Success Validation

### After Each Phase

- **Setup**: Dependencies installed, directories created
- **Foundational**: Jest configured, test setup file created
- **US1**: `npm test` runs and shows coverage, `npm run test:watch` works
- **US2**: `npm run lint` and `npm run format` work, pre-commit hook enforces quality
- **US3**: Retrospective tests pass, regression protected
- **US4**: CI runs tests and blocks failing merges
- **Polish**: Quickstart validation passes, documentation updated

### Final Validation (Run quickstart.md)

```bash
cd frontend

# All commands should succeed:
npm test                    # Tests run with coverage
npm run lint                # Zero errors
npm run format              # Code formatted
npm run test:watch          # Watch mode works

# Pre-commit should enforce quality:
git add .
git commit -m "test"        # Should run lint/format/test

# CI should validate quality:
git push                    # CI runs tests in Actions
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- This is an infrastructure feature - no traditional "implementation" code, mostly configuration
- US1 and US2 are both P1 and together form the MVP
- US3 depends on US1 (needs test runner)
- US4 depends on US1 and US2 (needs tests and linting)
- Avoid modifying existing ESLint/Prettier rules - activation only
- Pre-commit hooks integrate with existing Husky setup
- Coverage threshold is 80% for all metrics (branches, functions, lines, statements)
- Performance targets: tests <30s, lint <10s, format <5s
