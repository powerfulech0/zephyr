# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

### MVP Principles (v1.0.0)

**I. Real-time First** ✅ / ⚠️ / N/A
- Does this feature require real-time state synchronization?
- If yes, are WebSocket events planned for all state changes?
- Are connection/disconnection events tracked?

**II. Simplicity & Production Readiness** ✅ / ⚠️
- Is the simplest viable solution proposed?
- Are all external dependencies necessary and justified?
- Are there any architectural patterns (repositories, ORMs) being introduced? If yes, documented in Complexity Tracking?
- Is production infrastructure (databases, caching, monitoring) justified against specific requirements?

**III. Component Isolation** ✅ / ⚠️ / N/A
- Are Host and Participant responsibilities clearly separated?
- Does this feature maintain role-based permission boundaries?
- Are room isolation requirements satisfied?

**IV. Test-Driven Development** ✅ / ⚠️
- Are acceptance scenarios defined in Given-When-Then format in spec.md?
- Are integration tests planned for WebSocket flows?
- Are contract tests planned for APIs?
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md?

**V. Code Quality Standards** ✅ / ⚠️
- Are linting and formatting tools configured (ESLint, Prettier)?
- Is TypeScript strict mode enabled (if applicable)?
- Are pre-commit hooks configured for quality gates?
- Are security vulnerability scans configured?

**VI. Incremental Delivery** ✅ / ⚠️
- Are user stories prioritized (P1, P2, P3) in spec.md?
- Is each story independently testable?
- Are P1 stories planned for completion before P2 stories?

### Production Principles (v2.0.0)

**VII. Data Persistence & Reliability** ✅ / ⚠️ / N/A
- Is data persistence required for this feature?
- If yes, are all critical data entities identified for persistence?
- Are backup and recovery mechanisms planned?
- Are database migrations planned and reversible?
- Is zero data loss requirement addressed?

**VIII. Security First** ✅ / ⚠️
- Are all user inputs sanitized and validated?
- Is rate limiting planned to prevent abuse?
- Are CORS policies configured?
- Are security headers planned (CSP, X-Frame-Options, HSTS)?
- Are security events logged?
- Are secrets externalized (not hardcoded)?

**IX. Observability & Monitoring** ✅ / ⚠️ / N/A
- Are structured logs with correlation IDs planned?
- Are metrics exposed (request count, error rate, response time)?
- Are health check endpoints planned?
- Is centralized logging integration planned?
- Are alerts configured for critical errors?

**X. Deployment Excellence** ✅ / ⚠️ / N/A
- Is containerized deployment planned?
- Is configuration externalized?
- Are secrets loaded from secure vault?
- Is CI/CD pipeline configured (test, build, deploy)?
- Is zero-downtime deployment supported?
- Is automated rollback capability planned?

**XI. Scalability & Performance** ✅ / ⚠️ / N/A
- Does this feature require horizontal scaling?
- If yes, is session state shared across instances?
- Are load balancers with health checks planned?
- Is connection pooling configured for database access?
- Are performance targets defined and measurable?

**XII. Resilience & Error Handling** ✅ / ⚠️
- Is retry logic with exponential backoff planned for transient failures?
- Are circuit breakers planned for external dependencies?
- Are timeout limits defined for all external operations?
- Is graceful degradation planned for non-critical features?
- Are user-friendly error messages planned (no stack traces)?
- Is automatic WebSocket reconnection planned?

**Overall Status**: ✅ PASS / ⚠️ NEEDS ATTENTION / ❌ BLOCKED

*If any check is ⚠️ or ❌, document justification in Complexity Tracking table below.*

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
