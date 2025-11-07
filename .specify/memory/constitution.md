<!--
SYNC IMPACT REPORT

Version Change: [TEMPLATE] → 1.0.0 (Initial ratification)
Bump Rationale: MINOR - Initial constitution establishment with 6 core principles

Modified Principles: N/A (initial creation)
Added Sections:
  - I. Real-time First (WebSocket-driven architecture)
  - II. Simplicity & MVP Focus (In-memory, no premature optimization)
  - III. Component Isolation (Host/Participant separation)
  - IV. Test-Driven Development (TDD mandatory)
  - V. Code Quality Standards (Linting, formatting, type safety)
  - VI. Incremental Delivery (Story-based implementation)
  - Development Workflow section with pre-commit requirements
  - Governance section

Removed Sections: N/A (initial creation)

Templates Status:
  ✅ plan-template.md - Constitution Check section updated with specific principle checks
  ✅ spec-template.md - User story prioritization aligns with Incremental Delivery
  ✅ tasks-template.md - Story-based organization aligns with Incremental Delivery
  ✅ checklist-template.md - Generic template, no updates needed
  ✅ agent-file-template.md - Generic template, no principle-specific references

Follow-up TODOs: None
-->

# Zephyr Constitution

## Core Principles

### I. Real-time First

WebSocket communication is the architectural foundation of this project. All features MUST leverage Socket.io for state synchronization and real-time updates.

**Rules:**
- Every user interaction that affects shared state MUST broadcast via WebSocket events
- Poll state changes (open/close) MUST sync to all connected clients immediately
- Vote submissions MUST provide instant confirmation via socket acknowledgments
- Connection/disconnection events MUST be tracked and communicated

**Rationale:** Real-time feedback is the core value proposition for live polling. HTTP polling or delayed updates would degrade user experience below acceptable thresholds for the 5-20 person target audience.

### II. Simplicity & MVP Focus

Start with the simplest viable implementation. Complexity must be justified against concrete user needs.

**Rules:**
- MVP MUST use in-memory storage (no database)
- Feature requests outside MVP scope MUST be deferred unless blocking core functionality
- External dependencies MUST be minimized (Node.js + Express + Socket.io core stack)
- Architectural patterns (repositories, ORMs, microservices) are PROHIBITED in MVP unless explicitly justified in Complexity Tracking section

**Rationale:** The 2-5 day timeline and small user groups (5-20 people) do not warrant database infrastructure or complex patterns. In-memory storage handles the scale and enables rapid iteration. YAGNI principles prevent premature optimization.

### III. Component Isolation

Host and Participant roles have distinct responsibilities and MUST be implemented as separate, decoupled components.

**Rules:**
- Host dashboard MUST control poll lifecycle (create, open, close) independently
- Participant view MUST focus solely on joining, voting, and viewing results
- Room management MUST isolate polls by unique room codes
- User tracking MUST distinguish roles (host vs participant) and enforce permissions

**Rationale:** Role separation enables independent testing, parallel development, and prevents permission bugs. Clear boundaries reduce complexity and improve maintainability.

### IV. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. No production code may be written until corresponding tests exist and fail.

**Rules:**
- Red-Green-Refactor cycle strictly enforced: Write failing test → Implement → Refactor
- User stories MUST define acceptance scenarios in Given-When-Then format
- Integration tests MUST cover WebSocket event flows (connect, vote, broadcast)
- Contract tests MUST validate room management and vote tracking APIs
- Tests MUST run successfully before marking any implementation task complete
- All tests MUST pass before creating a commit

**Rationale:** Real-time WebSocket applications have complex state synchronization requirements. TDD catches race conditions, connection handling bugs, and state inconsistencies early. Given the 2-5 day timeline, bugs caught early save more time than tests cost to write.

### V. Code Quality Standards (NON-NEGOTIABLE)

Code MUST adhere to consistent style, formatting, and quality standards. Quality checks MUST pass before commits.

**Rules:**
- Linting MUST be configured and enforced (ESLint for JavaScript/TypeScript)
- Code formatting MUST be automated and consistent (Prettier or equivalent)
- Type safety MUST be enabled where applicable (TypeScript strict mode recommended)
- Code quality checks MUST pass before creating any commit
- Pre-commit hooks SHOULD be configured to enforce quality gates automatically
- Code MUST be free of security vulnerabilities flagged by static analysis tools
- Unused imports, variables, and dead code MUST be removed before commit

**Rationale:** Code quality issues compound rapidly in fast-paced development. Automated checks catch bugs, security issues, and inconsistencies before they enter the codebase. The 2-5 day timeline demands discipline to prevent technical debt accumulation that would slow later iterations.

### VI. Incremental Delivery

Features MUST be delivered as independently testable user stories, prioritized by value.

**Rules:**
- User stories MUST be prioritized (P1, P2, P3) in spec.md
- Each user story MUST be independently implementable and testable
- P1 stories MUST be completed before P2 stories begin
- Each story completion MUST include a validation checkpoint
- MVP (P1 story) MUST be demonstrable before expanding scope

**Rationale:** Story-based delivery enables early validation with real users, reduces rework from misaligned requirements, and provides natural rollback points if timeline pressure increases. The 2-5 day timeline demands ruthless prioritization.

## Development Workflow

### Feature Specification
- All features begin with `/speckit.specify` to create spec.md
- User stories MUST include priority levels and independent test descriptions
- Acceptance scenarios MUST use Given-When-Then format
- Edge cases MUST be documented before planning

### Implementation Planning
- All features require `/speckit.plan` to create plan.md and design artifacts
- Constitution Check MUST pass before Phase 0 research begins
- Complexity violations MUST be documented in Complexity Tracking table
- Project structure MUST be documented (backend/frontend split for this web app)

### Task Generation
- All features require `/speckit.tasks` to create tasks.md
- Tasks MUST be organized by user story
- Tasks MUST include [P] markers for parallel execution opportunities
- Tasks MUST include [Story] labels (e.g., [US1], [US2]) for traceability

### Quality Gates
- TDD: Tests written → Tests fail → Implementation → Tests pass
- Code quality: Linting → Formatting → Type checks → Security scans
- Constitution compliance verified before merging
- Quickstart validation run on task completion
- No merge without passing tests and quality checks

### Pre-Commit Requirements (NON-NEGOTIABLE)
Before creating any commit, the following MUST pass:
1. All tests MUST pass (unit, integration, contract as applicable)
2. Linting MUST pass with zero errors
3. Code formatting MUST be applied
4. Type checks MUST pass (if TypeScript is used)
5. No console.log or debug statements in production code
6. Security vulnerability scans MUST show no high/critical issues

## Governance

**Amendment Procedure:**
- Constitution changes require documentation of rationale and migration plan
- Version MUST increment per semantic versioning (MAJOR.MINOR.PATCH)
- All template files MUST be updated to reflect principle changes
- Sync Impact Report MUST be generated and prepended to constitution.md

**Compliance:**
- All PRs MUST verify adherence to Core Principles
- Complexity additions MUST be justified in plan.md Complexity Tracking
- Unjustified violations block merge
- Pre-commit quality gates MUST be enforced

**Versioning Policy:**
- MAJOR: Backward-incompatible principle removals or redefinitions
- MINOR: New principles added or materially expanded guidance
- PATCH: Clarifications, typo fixes, non-semantic refinements

**Version**: 1.0.0 | **Ratified**: 2025-11-07 | **Last Amended**: 2025-11-07
