# Tasks: Modernize Database Migration System

**Input**: Design documents from `/specs/014-knex-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD workflow enforced - tests written before implementation per Constitution Principle IV

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with backend-only changes:
- Backend source: `backend/src/`
- Backend tests: `backend/tests/`
- Backend config: `backend/` (root level)
- Migrations: `backend/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Knex migration system

- [x] T001 Install Knex.js as devDependency in backend/package.json
- [x] T002 [P] Create migrations directory at backend/migrations/ with .gitkeep file
- [x] T003 [P] Create test directory at backend/tests/unit/migrations/
- [x] T004 Verify existing environment variables (POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD) are set

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Knex configuration that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create knexfile.js configuration in backend/src/config/knexfile.js with development, test, production environments
- [x] T006 [P] Write unit test for knexfile.js configuration loading in backend/tests/unit/migrations/knexfile.test.js
- [x] T007 [P] Verify knexfile.js loads correctly and connects to database in test environment

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Applies Database Schema Changes (Priority: P1) 🎯 MVP

**Goal**: Enable developers to apply pending migrations using Knex with `npm run migrate:up` command

**Independent Test**: Run `npm run migrate:up` and verify migrations execute successfully and database schema is updated

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write integration test for applying pending migrations in backend/tests/integration/migrations/apply-migrations.test.js
- [x] T009 [P] [US1] Write integration test for "already up to date" scenario in backend/tests/integration/migrations/apply-migrations.test.js
- [x] T010 [P] [US1] Write integration test for migration status reporting in backend/tests/integration/migrations/migration-status.test.js

### Implementation for User Story 1

- [x] T011 [US1] Update package.json script `migrate:up` to use `knex migrate:latest --knexfile=src/config/knexfile.js` in backend/package.json
- [x] T012 [US1] Update package.json script `migrate:status` to use `knex migrate:status --knexfile=src/config/knexfile.js` in backend/package.json
- [x] T013 [US1] Create example migration file to test migration execution in backend/migrations/
- [x] T014 [US1] Test migration execution manually: run `npm run migrate:up` and verify knex_migrations table created
- [x] T015 [US1] Test migration status: run `npm run migrate:status` and verify output shows applied migrations
- [x] T016 [US1] Verify all integration tests pass for User Story 1

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can apply migrations using Knex

---

## Phase 4: User Story 4 - Historical Schema Changes are Preserved (Priority: P1)

**Goal**: Preserve all historical db-migrate migration history in Knex migration system

**Independent Test**: Verify that all db-migrate migrations are recorded in knex_migrations table and not re-executed

**Note**: US4 is also P1 and must be completed as part of MVP alongside US1

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US4] Write integration test to verify db-migrate history preservation in backend/tests/integration/migrations/history-preservation.test.js
- [x] T018 [P] [US4] Write test to verify historical migrations not re-executed in backend/tests/integration/migrations/history-preservation.test.js

### Implementation for User Story 4

- [x] T019 [US4] Create script to query existing db-migrate migrations table in backend/scripts/migrate-history.js
- [x] T020 [US4] Implement migration history seeding logic to copy from migrations to knex_migrations table in backend/scripts/migrate-history.js
- [x] T021 [US4] Add validation to ensure migration count matches between old and new tables in backend/scripts/migrate-history.js
- [x] T022 [US4] Document migration history preservation process in backend/scripts/migrate-history.js comments
- [x] T023 [US4] Execute migration history seeding script and verify knex_migrations table populated
- [x] T024 [US4] Verify `npm run migrate:status` shows historical migrations as already applied
- [x] T025 [US4] Verify all integration tests pass for User Story 4

**Checkpoint**: At this point, historical migration data is preserved and MVP is feature-complete (US1 + US4)

---

## Phase 5: User Story 2 - Developer Reverts Database Schema Changes (Priority: P2)

**Goal**: Enable developers to rollback migrations using Knex with `npm run migrate:down` command

**Independent Test**: Apply migrations, then run `npm run migrate:down` and verify schema reverts to previous state

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T026 [P] [US2] Write integration test for rolling back migrations in backend/tests/integration/migrations/rollback-migrations.test.js
- [ ] T027 [P] [US2] Write integration test for "already at base" scenario in backend/tests/integration/migrations/rollback-migrations.test.js
- [ ] T028 [P] [US2] Write integration test for failed rollback reporting in backend/tests/integration/migrations/rollback-migrations.test.js

### Implementation for User Story 2

- [ ] T029 [US2] Update package.json script `migrate:down` to use `knex migrate:rollback --knexfile=src/config/knexfile.js` in backend/package.json
- [ ] T030 [US2] Test rollback execution manually: run `npm run migrate:down` and verify migrations rolled back
- [ ] T031 [US2] Verify rollback removes entries from knex_migrations table (most recent batch)
- [ ] T032 [US2] Test "already at base" scenario: run `migrate:down` with no migrations applied
- [ ] T033 [US2] Verify all integration tests pass for User Story 2

**Checkpoint**: At this point, User Stories 1, 4, AND 2 should all work independently

---

## Phase 6: User Story 3 - Developer Creates New Schema Change Definitions (Priority: P3)

**Goal**: Enable developers to create new migration files using Knex with `npm run migrate:create` command

**Independent Test**: Run `npm run migrate:create <name>` and verify properly formatted migration file is generated

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T034 [P] [US3] Write integration test for creating migration files in backend/tests/integration/migrations/create-migration.test.js
- [ ] T035 [P] [US3] Write test for migration file naming convention in backend/tests/integration/migrations/create-migration.test.js
- [ ] T036 [P] [US3] Write test for automatic directory creation in backend/tests/integration/migrations/create-migration.test.js

### Implementation for User Story 3

- [ ] T037 [US3] Update package.json script `migrate:create` to use `knex migrate:make --knexfile=src/config/knexfile.js` in backend/package.json
- [ ] T038 [US3] Test migration creation manually: run `npm run migrate:create test_migration` and verify file created
- [ ] T039 [US3] Verify migration file has correct format (up/down functions, timestamp naming)
- [ ] T040 [US3] Verify migration file created in backend/migrations/ directory
- [ ] T041 [US3] Verify all integration tests pass for User Story 3

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and final validation

- [ ] T042 [P] Remove db-migrate and db-migrate-pg from devDependencies in backend/package.json
- [ ] T043 [P] Archive database.json file (rename to database.json.bak for historical reference)
- [ ] T044 Update CLAUDE.md with note about db-migrate → Knex migration (if not already updated)
- [ ] T045 [P] Add migration best practices documentation to backend/migrations/README.md
- [ ] T046 Run all tests to ensure nothing broken: `npm test` in backend/
- [ ] T047 Validate quickstart.md workflows manually (create, apply, rollback, status)
- [ ] T048 Run linting and formatting: `npm run lint` and `npm run format` in backend/
- [ ] T049 [P] Update deployment documentation if needed (CI/CD pipeline references)
- [ ] T050 Create migration guide document explaining db-migrate → Knex transition for team

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase - P1 MVP requirement
- **User Story 4 (Phase 4)**: Depends on Foundational phase and US1 completion - P1 MVP requirement (must preserve history before going live)
- **User Story 2 (Phase 5)**: Depends on Foundational phase - P2 (can be implemented after MVP)
- **User Story 3 (Phase 6)**: Depends on Foundational phase - P3 (can be implemented after MVP)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

**MVP Scope (P1 - Must Complete)**:
- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P1)**: Can start after US1 completes - Requires US1 to be functional to verify historical migrations not re-executed

**Post-MVP (P2, P3 - Can be deferred)**:
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories

### Within Each User Story

1. Tests MUST be written FIRST and FAIL before implementation (TDD)
2. Configuration before execution
3. Core implementation before edge cases
4. Manual testing before integration test verification
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T001-T004 can run in parallel (marked with [P])

**Phase 2 (Foundational)**: Tasks T006-T007 can run in parallel after T005 completes

**Phase 3 (US1 Tests)**: Tasks T008-T010 can all run in parallel (different test files)

**Phase 4 (US4 Tests)**: Tasks T017-T018 can run in parallel (same test file, different scenarios)

**Phase 5 (US2 Tests)**: Tasks T026-T028 can run in parallel (different test scenarios)

**Phase 6 (US3 Tests)**: Tasks T034-T036 can run in parallel (different test scenarios)

**Phase 7 (Polish)**: Tasks T042, T043, T045, T048, T049 can run in parallel (different files)

**User Stories**: US2 and US3 can be worked on in parallel by different team members (both P2+ priority, no cross-dependencies)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write integration test for applying pending migrations"
Task: "Write integration test for already up to date scenario"
Task: "Write integration test for migration status reporting"

# After tests written and failing, implement sequentially:
# T011 → T012 → T013 → T014 → T015 → T016
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (apply migrations)
4. Complete Phase 4: User Story 4 (preserve history) - **CRITICAL for production safety**
5. **STOP and VALIDATE**: Test both US1 and US4 independently
6. Deploy/demo if ready - MVP is feature-complete

**MVP Justification**: US1 + US4 together provide the minimum viable migration system:
- US1: Developers can apply migrations (core functionality)
- US4: Historical data preserved (zero data loss requirement)
- This is the smallest increment that safely replaces db-migrate

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + User Story 4 → Test independently → Deploy/Demo (MVP! ✅)
3. Add User Story 2 → Test independently → Deploy/Demo (Rollback capability)
4. Add User Story 3 → Test independently → Deploy/Demo (Migration creation convenience)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers (post-MVP):

1. Team completes Setup + Foundational together
2. Team completes MVP (US1 + US4) together
3. Once MVP complete:
   - Developer A: User Story 2 (rollback)
   - Developer B: User Story 3 (create migrations)
   - Developer C: Polish & documentation
4. Stories complete and integrate independently

---

## Testing Strategy (TDD)

### Test-First Workflow (Constitution Principle IV)

For each user story:

1. **Write Tests First** (all [P] tests can be written in parallel)
   - Integration tests define acceptance scenarios
   - Tests MUST fail initially (no implementation yet)

2. **Implement Minimum Code to Pass Tests**
   - Implement user story tasks sequentially
   - Run tests after each task
   - Tests gradually pass as implementation progresses

3. **Refactor**
   - Clean up code while keeping tests green
   - Ensure code quality standards met

4. **Verify Independently**
   - Each user story must work standalone
   - Test checkpoints defined for each phase

### Test Coverage

- **Unit Tests**: Configuration loading (knexfile.js)
- **Integration Tests**: Full migration workflows (apply, rollback, status, create)
- **Validation Tests**: Historical data preservation, idempotency

### Running Tests

```bash
# All tests
cd backend && npm test

# Specific test suite
npm test -- tests/integration/migrations/

# Watch mode during development
npm run test:watch
```

---

## Success Criteria Validation

After completing all phases, verify:

- ✅ **SC-001**: Migration execution <10 seconds (test with example migration)
- ✅ **SC-002**: Rollback works without data loss (test in development)
- ✅ **SC-003**: Zero migration history lost (verify db-migrate count = knex count)
- ✅ **SC-004**: Backward compatible commands (same npm script names work)
- ✅ **SC-005**: Clear error messages (test with intentional failures)
- ✅ **SC-006**: Documentation enables first-time success (have someone unfamiliar try quickstart.md)
- ✅ **SC-007**: Duplicate execution prevented (try running same migration twice)
- ✅ **SC-008**: 95% success rate (monitor first 20 migrations applied)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Enforcement**: All tests written BEFORE implementation (Constitution Principle IV)
- **Independent Stories**: Each user story completable and testable independently
- **MVP Definition**: US1 (apply) + US4 (preserve history) = minimum viable replacement
- **Commit Strategy**: Commit after each logical task group or checkpoint
- **Quality Gates**: All tests must pass, linting clean before merge
- **Rollback Plan**: Keep db-migrate installed until US1+US4 validated in production

## Task Count Summary

- **Total Tasks**: 50
- **Setup (Phase 1)**: 4 tasks
- **Foundational (Phase 2)**: 3 tasks
- **User Story 1 (P1)**: 9 tasks (3 tests + 6 implementation)
- **User Story 4 (P1)**: 9 tasks (2 tests + 7 implementation)
- **User Story 2 (P2)**: 8 tasks (3 tests + 5 implementation)
- **User Story 3 (P3)**: 8 tasks (3 tests + 5 implementation)
- **Polish (Phase 7)**: 9 tasks

**Parallel Opportunities**: 23 tasks marked with [P] can run in parallel with other [P] tasks in same phase

**MVP Scope**: 25 tasks (Phase 1 + Phase 2 + Phase 3 + Phase 4)
