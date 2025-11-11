# Implementation Plan: Fix Option Input Focus

**Branch**: `010-fix-option-input-focus` | **Date**: 2025-11-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-fix-option-input-focus/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fix critical bug where poll option input fields lose focus after typing a single character, making poll creation nearly unusable. The root cause is an unstable React key prop on line 190 of HostDashboard.jsx that uses the option value (which changes on every keystroke), causing React to unmount and remount the input component. The fix involves using a stable index-based key instead.

## Technical Context

**Language/Version**: JavaScript ES6+ (frontend), React 19.2.0
**Primary Dependencies**: React 19.2.0, Vite 7.2.2 (build tool), react-dom 19.2.0
**Storage**: N/A (bug fix only, no data storage changes)
**Testing**: Jest 30.2.0, @testing-library/react 16.3.0, @testing-library/jest-dom 6.9.1
**Target Platform**: Web browsers (desktop and mobile)
**Project Type**: Web application (frontend/backend split)
**Performance Goals**: Instant focus maintenance (<1ms response time for keystroke handling)
**Constraints**: Must not break existing poll creation functionality, maintain accessibility
**Scale/Scope**: Single component fix (HostDashboard.jsx line 190), affects all option input fields

**Root Cause Identified**: Line 190 in `frontend/src/pages/HostDashboard.jsx` uses an unstable key prop:
```jsx
key={option || `empty-option-${index}`}
```
When the user types, `option` changes, causing React to unmount the old component and mount a new one, losing focus.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

### MVP Principles (v1.0.0)

**I. Real-time First** N/A
- Does this feature require real-time state synchronization? **No** - This is a UI focus bug fix, no WebSocket changes needed
- If yes, are WebSocket events planned for all state changes? N/A
- Are connection/disconnection events tracked? N/A (already implemented)

**II. Simplicity & Production Readiness** ✅
- Is the simplest viable solution proposed? **Yes** - Change one line (key prop from dynamic to static)
- Are all external dependencies necessary and justified? **Yes** - No new dependencies
- Are there any architectural patterns (repositories, ORMs) being introduced? **No**
- Is production infrastructure (databases, caching, monitoring) justified against specific requirements? **N/A** - No infrastructure changes

**III. Component Isolation** ✅
- Are Host and Participant responsibilities clearly separated? **Yes** - This fix only affects HostDashboard component
- Does this feature maintain role-based permission boundaries? **Yes** - No permission changes
- Are room isolation requirements satisfied? **Yes** - No room isolation changes

**IV. Test-Driven Development** ✅
- Are acceptance scenarios defined in Given-When-Then format in spec.md? **Yes** - 6 scenarios defined
- Are integration tests planned for WebSocket flows? **N/A** - No WebSocket changes
- Are contract tests planned for APIs? **N/A** - No API changes
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md? **Yes** - Will be in tasks.md

**V. Code Quality Standards** ✅
- Are linting and formatting tools configured (ESLint, Prettier)? **Yes** - Already configured
- Is TypeScript strict mode enabled (if applicable)? **N/A** - Using JavaScript
- Are pre-commit hooks configured for quality gates? **Yes** - Already configured
- Are security vulnerability scans configured? **Yes** - npm audit available

**VI. Incremental Delivery** ✅
- Are user stories prioritized (P1, P2, P3) in spec.md? **Yes** - P1 and P2 defined
- Is each story independently testable? **Yes** - P1 tests basic typing, P2 tests multi-field workflow
- Are P1 stories planned for completion before P2 stories? **Yes** - P1 is the core fix

### Production Principles (v2.0.0)

**VII. Data Persistence & Reliability** N/A
- Is data persistence required for this feature? **No** - UI-only bug fix
- If yes, are all critical data entities identified for persistence? N/A
- Are backup and recovery mechanisms planned? N/A
- Are database migrations planned and reversible? N/A
- Is zero data loss requirement addressed? N/A

**VIII. Security First** ✅
- Are all user inputs sanitized and validated? **Yes** - Existing validation remains unchanged
- Is rate limiting planned to prevent abuse? **N/A** - No new endpoints
- Are CORS policies configured? **N/A** - No backend changes
- Are security headers planned (CSP, X-Frame-Options, HSTS)? **N/A** - No security changes
- Are security events logged? **N/A** - No security-relevant events
- Are secrets externalized (not hardcoded)? **N/A** - No secrets involved

**IX. Observability & Monitoring** N/A
- Are structured logs with correlation IDs planned? **N/A** - No logging changes needed
- Are metrics exposed (request count, error rate, response time)? **N/A** - No new metrics
- Are health check endpoints planned? **N/A** - No backend changes
- Is centralized logging integration planned? **N/A** - No logging changes
- Are alerts configured for critical errors? **N/A** - No new alerts needed

**X. Deployment Excellence** ✅
- Is containerized deployment planned? **N/A** - Uses existing deployment
- Is configuration externalized? **N/A** - No configuration changes
- Are secrets loaded from secure vault? **N/A** - No secrets
- Is CI/CD pipeline configured (test, build, deploy)? **Yes** - Already configured
- Is zero-downtime deployment supported? **N/A** - Uses existing deployment
- Is automated rollback capability planned? **N/A** - Uses existing rollback

**XI. Scalability & Performance** N/A
- Does this feature require horizontal scaling? **No** - Client-side bug fix
- If yes, is session state shared across instances? N/A
- Are load balancers with health checks planned? N/A
- Is connection pooling configured for database access? N/A
- Are performance targets defined and measurable? **Yes** - Instant focus maintenance (<1ms)

**XII. Resilience & Error Handling** ✅
- Is retry logic with exponential backoff planned for transient failures? **N/A** - No network calls
- Are circuit breakers planned for external dependencies? **N/A** - No external deps
- Are timeout limits defined for all external operations? **N/A** - No external operations
- Is graceful degradation planned for non-critical features? **N/A** - Core functionality fix
- Are user-friendly error messages planned (no stack traces)? **N/A** - No error handling changes
- Is automatic WebSocket reconnection planned? **N/A** - Already implemented

**Overall Status**: ✅ PASS

*This is a minimal, focused bug fix that changes a single line of code. All applicable constitution principles are satisfied. No complexity is being added.*

## Project Structure

### Documentation (this feature)

```text
specs/010-fix-option-input-focus/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command) - N/A for this bug fix
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - N/A for this bug fix
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── HostDashboard.jsx    # Bug location: line 190 key prop
│   │   └── HostDashboard.css
│   ├── components/
│   │   ├── PollControls.jsx
│   │   ├── PollResults.jsx
│   │   └── ParticipantCounter.jsx
│   └── services/
│       ├── apiService.js
│       └── socketService.js
└── tests/
    ├── unit/
    │   └── pages/
    │       └── HostDashboard.test.jsx   # New tests to be added
    └── integration/
        └── HostDashboard.integration.test.jsx   # Existing tests to verify
```

**Structure Decision**: Web application with frontend/backend split. This bug fix only affects the frontend HostDashboard component. No backend changes required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. This is a minimal bug fix with no added complexity.

## Post-Design Constitution Re-evaluation

After completing Phase 0 (Research) and Phase 1 (Design):

**Overall Status**: ✅ PASS (unchanged)

**Summary**:
- No new dependencies added
- No architectural changes introduced
- No data model changes required
- No API contracts modified
- Single-line code change with focused unit tests
- All applicable constitution principles remain satisfied

**Design Artifacts Created**:
- ✅ research.md - Root cause analysis and solution justification
- ✅ quickstart.md - Validation steps and troubleshooting guide
- ⏭️ data-model.md - N/A (no data model changes for bug fix)
- ⏭️ contracts/ - N/A (no API changes for bug fix)

**Ready for Phase 2**: Yes - Proceed to `/speckit.tasks` to generate implementation tasks.
