# Implementation Plan: Fix Failing Integration Tests

**Branch**: `006-fix-integration-tests` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-fix-integration-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix 3 failing integration tests in `frontend/tests/integration/userFlows.test.js` by:
1. Adding missing `joinSocketRoom` function to socket service mock
2. Resolving component rendering issues that cause empty DOM
3. Adding defensive null checks in PollControls component to handle undefined pollState

This is a bug fix targeting test infrastructure and component reliability without introducing new features.

## Technical Context

**Language/Version**: JavaScript ES6+ (frontend), Node.js 18+ LTS (test runner)
**Primary Dependencies**: React 18.x, Jest 30.x, @testing-library/react, @testing-library/jest-dom, prop-types
**Storage**: N/A (code quality feature, no data storage changes)
**Testing**: Jest 30.x with @testing-library/react for component testing
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend-only changes)
**Performance Goals**: N/A (bug fix only)
**Constraints**: All 3 failing integration tests must pass; no new test failures introduced; maintain existing test coverage
**Scale/Scope**: 3 test fixes across 1 test file, 2 source files (mock + component)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

### MVP Principles (v1.0.0)

**I. Real-time First** N/A
- Does this feature require real-time state synchronization? **No** - This is a test fix, not a feature
- If yes, are WebSocket events planned for all state changes? **N/A**
- Are connection/disconnection events tracked? **N/A** - Already implemented

**II. Simplicity & Production Readiness** ✅
- Is the simplest viable solution proposed? **Yes** - Adding missing mock function, defensive null checks
- Are all external dependencies necessary and justified? **Yes** - No new dependencies
- Are there any architectural patterns (repositories, ORMs) being introduced? **No**
- Is production infrastructure (databases, caching, monitoring) justified against specific requirements? **N/A** - No infrastructure changes

**III. Component Isolation** N/A
- Are Host and Participant responsibilities clearly separated? **N/A** - No role changes
- Does this feature maintain role-based permission boundaries? **N/A** - No permission changes
- Are room isolation requirements satisfied? **N/A** - No room isolation changes

**IV. Test-Driven Development** ⚠️
- Are acceptance scenarios defined in Given-When-Then format in spec.md? **Yes** - Defined in spec.md
- Are integration tests planned for WebSocket flows? **No** - Tests already exist, we're fixing them
- Are contract tests planned for APIs? **No** - Tests already exist
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md? **Inverted** - Tests exist and fail; we fix implementation

**V. Code Quality Standards** ✅
- Are linting and formatting tools configured (ESLint, Prettier)? **Yes** - Already configured from feature #004
- Is TypeScript strict mode enabled (if applicable)? **N/A** - JavaScript project
- Are pre-commit hooks configured for quality gates? **Yes** - Already configured
- Are security vulnerability scans configured? **Yes** - npm audit available

**VI. Incremental Delivery** ✅
- Are user stories prioritized (P1, P2, P3) in spec.md? **Yes** - All P1 stories
- Is each story independently testable? **Yes** - Each fix can be independently verified
- Are P1 stories planned for completion before P2 stories? **Yes** - All P1

### Production Principles (v2.0.0)

**VII. Data Persistence & Reliability** N/A
- Is data persistence required for this feature? **No** - Test infrastructure fix only

**VIII. Security First** N/A
- Are all user inputs sanitized and validated? **N/A** - No user input handling changes
- Is rate limiting planned to prevent abuse? **N/A** - No API changes
- Are CORS policies configured? **N/A** - Already configured
- Are security headers planned (CSP, X-Frame-Options, HSTS)? **N/A** - Already configured
- Are security events logged? **N/A** - No security changes
- Are secrets externalized (not hardcoded)? **N/A** - No secrets involved

**IX. Observability & Monitoring** N/A
- Are structured logs with correlation IDs planned? **N/A** - Frontend test fix, no logging changes
- Are metrics exposed (request count, error rate, response time)? **N/A** - No metrics changes
- Are health check endpoints planned? **N/A** - No backend changes
- Is centralized logging integration planned? **N/A** - Test-only changes
- Are alerts configured for critical errors? **N/A** - Test-only changes

**X. Deployment Excellence** N/A
- Is containerized deployment planned? **N/A** - No deployment changes
- Is configuration externalized? **N/A** - No config changes
- Are secrets loaded from secure vault? **N/A** - No secrets
- Is CI/CD pipeline configured (test, build, deploy)? **Already configured**
- Is zero-downtime deployment supported? **N/A** - No deployment changes
- Is automated rollback capability planned? **N/A** - No deployment changes

**XI. Scalability & Performance** N/A
- Does this feature require horizontal scaling? **No** - Test fix only
- If yes, is session state shared across instances? **N/A**
- Are load balancers with health checks planned? **N/A**
- Is connection pooling configured for database access? **N/A**
- Are performance targets defined and measurable? **N/A** - Bug fix only

**XII. Resilience & Error Handling** ✅
- Is retry logic with exponential backoff planned for transient failures? **N/A** - Test fix
- Are circuit breakers planned for external dependencies? **N/A** - Test fix
- Are timeout limits defined for all external operations? **N/A** - Test fix
- Is graceful degradation planned for non-critical features? **N/A** - Test fix
- Are user-friendly error messages planned (no stack traces)? **N/A** - Test fix
- Is automatic WebSocket reconnection planned? **Already implemented** - Adding defensive checks to handle undefined state

**Overall Status**: ✅ PASS

*Justification for IV ⚠️: This is a bug fix where tests already exist but are failing. The workflow is inverted (fix implementation → tests pass) rather than standard TDD (write tests → fail → implement → pass). This is acceptable for bug fixes targeting existing test failures.*

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-integration-tests/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output (completed)
├── quickstart.md        # Phase 1 output (completed)
├── contracts/           # Phase 1 output (completed)
│   └── test-contracts.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── PollControls.jsx           # [FIX REQUIRED] Update PropTypes line 49
│   ├── pages/
│   │   ├── HostDashboard.jsx          # Used in failing tests
│   │   ├── VotePage.jsx               # Used in passing tests
│   │   └── JoinPage.jsx               # Used in passing tests
│   └── services/
│       ├── socketService.js           # Real socket service (reference for mock)
│       ├── apiService.js              # API service (already mocked in tests)
│       └── __mocks__/
│           └── socketService.js       # [VERIFY] Exports joinSocketRoom (line 2)
└── tests/
    ├── contract/
    │   └── HostDashboard.test.js      # Passing (4/4 tests)
    ├── integration/
    │   └── userFlows.test.js          # [FAILING] 3 tests failing (target of this fix)
    └── unit/
        ├── components.test.js         # Passing
        └── roomCodeFormatter.test.js  # Passing
```

**Structure Decision**: Web application (frontend-only changes)

This feature only modifies frontend code. No backend changes are required since the failures are in test infrastructure and component defensive coding, not in API or WebSocket behavior.

**Files Modified**:
1. `frontend/src/components/PollControls.jsx` - Update PropTypes to make pollState optional
2. `frontend/src/services/__mocks__/socketService.js` - Verify exports (likely no changes needed)
3. `frontend/tests/integration/userFlows.test.js` - Potentially add debug output or fix test setup (if component rendering issue persists)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This is a simple bug fix with no architectural complexity additions.

## Implementation Summary

### Phase 0: Research (Completed)

All unknowns resolved in `research.md`:
- Socket service mock missing function: **Resolved** - Already exported, verify test setup
- Component rendering issues: **Resolved** - Add proper state initialization and async handling
- Defensive null checks: **Resolved** - Make PropTypes optional, component already uses defensive coding

### Phase 1: Design (Completed)

Generated artifacts:
- ✅ `data-model.md` - Documents existing data structures (PollState, Socket Mock interface)
- ✅ `contracts/test-contracts.md` - Defines test success criteria and component contracts
- ✅ `quickstart.md` - Provides validation commands and debugging steps
- ✅ Updated `CLAUDE.md` - Added technology stack for this feature

### Phase 2: Task Generation (Next Step)

Run `/speckit.tasks` to generate `tasks.md` with implementation checklist organized by user story.

## Next Steps

1. Run `/speckit.tasks` to generate tasks.md
2. Run `/speckit.implement` to execute the implementation
3. Verify all 3 failing tests pass
4. Run full test suite to ensure no regressions
5. Run linting and formatting
6. Commit changes and create PR

## References

- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/test-contracts.md](./contracts/test-contracts.md)
- **Quickstart**: [quickstart.md](./quickstart.md)
