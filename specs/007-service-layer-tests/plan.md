# Implementation Plan: Service Layer Unit Tests

**Branch**: `007-service-layer-tests` | **Date**: 2025-11-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-service-layer-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create comprehensive unit test suites for `frontend/src/services/apiService.js` and `frontend/src/services/socketService.js` to achieve ≥80% code coverage. This testing infrastructure feature will enable developers to confidently refactor and maintain service layer code by providing immediate feedback on breaking changes and validating all success paths, error scenarios, and edge cases.

## Technical Context

**Language/Version**: JavaScript ES6+ (frontend)
**Primary Dependencies**: Jest 30.x, @testing-library/react, @testing-library/jest-dom, babel-jest
**Storage**: N/A (testing infrastructure)
**Testing**: Jest with jsdom environment, Babel for ES6+ module transformation
**Target Platform**: Node.js 18+ LTS (test runner), jsdom (browser environment simulation)
**Project Type**: Web application (frontend tests only)
**Performance Goals**: Test execution <10 seconds for rapid feedback
**Constraints**: ≥80% coverage across all metrics (statements, branches, functions, lines), tests must be isolated (no network calls)
**Scale/Scope**: 2 service files (~200 LOC total), estimated 15-20 test cases per file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

### MVP Principles (v1.0.0)

**I. Real-time First** N/A
- Does this feature require real-time state synchronization? **No - testing infrastructure feature**
- Testing the real-time service (socketService), but tests themselves don't need real-time sync

**II. Simplicity & Production Readiness** ✅
- Is the simplest viable solution proposed? **Yes - unit tests using existing Jest infrastructure**
- Are all external dependencies necessary and justified? **Yes - Jest 30.x, @testing-library/* already configured in feature #004**
- Are there any architectural patterns (repositories, ORMs) being introduced? **No - pure test code**
- Is production infrastructure (databases, caching, monitoring) justified against specific requirements? **N/A - no production infrastructure added**

**III. Component Isolation** N/A
- Are Host and Participant responsibilities clearly separated? **N/A - testing infrastructure**
- Feature tests service layer code that already maintains component isolation

**IV. Test-Driven Development** ✅
- Are acceptance scenarios defined in Given-When-Then format in spec.md? **Yes - 8 scenarios defined**
- Are integration tests planned for WebSocket flows? **No - unit tests only (integration tests exist separately)**
- Are contract tests planned for APIs? **No - unit tests for services that consume APIs**
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md? **Yes - will be reflected in tasks.md**

**V. Code Quality Standards** ✅
- Are linting and formatting tools configured (ESLint, Prettier)? **Yes - configured in feature #004 and #005**
- Is TypeScript strict mode enabled (if applicable)? **N/A - JavaScript project**
- Are pre-commit hooks configured for quality gates? **Yes - Husky configured in feature #004**
- Are security vulnerability scans configured? **Yes - npm audit in existing workflow**

**VI. Incremental Delivery** ✅
- Are user stories prioritized (P1, P2, P3) in spec.md? **Yes - 2 P1 stories**
- Is each story independently testable? **Yes - apiService tests and socketService tests are independent**
- Are P1 stories planned for completion before P2 stories? **Yes - both are P1, can be done in sequence**

### Production Principles (v2.0.0)

**VII. Data Persistence & Reliability** N/A
- Is data persistence required for this feature? **No - test code doesn't persist data**

**VIII. Security First** N/A
- Are all user inputs sanitized and validated? **N/A - test code has no user inputs**
- Tests validate that the services handle inputs correctly, but tests themselves don't process user input

**IX. Observability & Monitoring** N/A
- Are structured logs with correlation IDs planned? **No - test output via Jest's built-in reporters**
- Are metrics exposed? **Yes - coverage metrics via Jest coverage reports**

**X. Deployment Excellence** N/A
- Is containerized deployment planned? **No - tests run in CI, not deployed**
- Is CI/CD pipeline configured? **Yes - existing CI runs tests automatically**

**XI. Scalability & Performance** ✅
- Does this feature require horizontal scaling? **No - unit tests run locally/CI**
- Are performance targets defined and measurable? **Yes - <10s execution time (SC-005)**

**XII. Resilience & Error Handling** ✅
- Is retry logic with exponential backoff planned for transient failures? **N/A - test code**
- Are circuit breakers planned for external dependencies? **N/A - mocks eliminate external dependencies**
- Are timeout limits defined for all external operations? **N/A - no external operations in unit tests**
- Is graceful degradation planned for non-critical features? **N/A - tests fail fast**
- Are user-friendly error messages planned? **Yes - Jest provides clear test failure messages**
- Tests validate error handling in the services being tested (FR-006, FR-009)

**Overall Status**: ✅ PASS

*All applicable principles satisfied. Testing infrastructure features naturally have N/A status for many production principles.*

## Project Structure

### Documentation (this feature)

```text
specs/007-service-layer-tests/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Jest mocking patterns research
├── data-model.md        # Phase 1 output - N/A for testing feature (will document test structure)
├── quickstart.md        # Phase 1 output - Quick test execution guide
├── contracts/           # Phase 1 output - Test contract definitions
│   ├── apiService-test-contract.md
│   └── socketService-test-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── services/
│       ├── apiService.js         # Existing - to be tested
│       └── socketService.js      # Existing - to be tested
├── tests/
│   ├── setup.js                  # Existing - Jest setup from feature #004
│   ├── unit/
│   │   ├── components.test.js    # Existing from feature #004
│   │   ├── roomCodeFormatter.test.js  # Existing from feature #005
│   │   ├── apiService.test.js    # NEW - API service unit tests
│   │   └── socketService.test.js # NEW - Socket service unit tests
│   ├── contract/
│   │   └── HostDashboard.test.js # Existing - reference pattern for mocking
│   └── integration/
│       └── userFlows.test.js     # Existing
├── jest.config.js                # Existing - configured in feature #004
├── .babelrc                      # Existing - Babel config for Jest
└── package.json                  # Existing - contains test scripts
```

**Structure Decision**: Web application structure with frontend-only changes. This feature adds 2 new test files to the existing `frontend/tests/unit/` directory established in feature #004. No backend changes required. Tests will follow the mocking pattern demonstrated in `tests/contract/HostDashboard.test.js`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity violations. All constitution checks passed.
