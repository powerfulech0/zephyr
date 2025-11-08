<!--
SYNC IMPACT REPORT

Version Change: 1.0.0 → 2.0.0
Bump Rationale: MAJOR - Principle II redefined to allow production infrastructure (backward-incompatible governance change) + 6 new production principles added

Modified Principles:
  - II. Simplicity & MVP Focus → II. Simplicity & Production Readiness
    - Removed database prohibition
    - Added production infrastructure allowances with justification requirement
    - Maintains simplicity principle while enabling production deployment

Added Principles:
  - VII. Data Persistence & Reliability (Production-critical)
  - VIII. Security First (Production-critical)
  - IX. Observability & Monitoring (Operational excellence)
  - X. Deployment Excellence (Automation & safety)
  - XI. Scalability & Performance (Growth enablement)
  - XII. Resilience & Error Handling (Reliability patterns)

Removed Principles: None

Templates Status:
  ✅ plan-template.md - Constitution Check section updated with 12 principles (MVP + Production)
  ✅ spec-template.md - No changes required (user story prioritization remains valid)
  ✅ tasks-template.md - No changes required (story-based organization remains valid)
  ✅ checklist-template.md - No changes required
  ✅ agent-file-template.md - No changes required

Follow-up TODOs: None
-->

# Zephyr Constitution

## Core Principles

### MVP Principles (Established v1.0.0)

#### I. Real-time First

WebSocket communication is the architectural foundation of this project. All features MUST leverage Socket.io for state synchronization and real-time updates.

**Rules:**
- Every user interaction that affects shared state MUST broadcast via WebSocket events
- Poll state changes (open/close) MUST sync to all connected clients immediately
- Vote submissions MUST provide instant confirmation via socket acknowledgments
- Connection/disconnection events MUST be tracked and communicated

**Rationale:** Real-time feedback is the core value proposition for live polling. HTTP polling or delayed updates would degrade user experience below acceptable thresholds for the 5-20 person target audience.

#### II. Simplicity & Production Readiness

Start with the simplest viable implementation. Complexity must be justified against concrete user needs. Production infrastructure is permitted when necessary for reliability, security, or scalability.

**Rules:**
- Feature requests outside current scope MUST be deferred unless blocking core functionality
- External dependencies MUST be minimized and justified
- Production infrastructure (databases, caching, monitoring) MUST be justified in plan.md Complexity Tracking
- Architectural patterns (repositories, ORMs, microservices) MUST be justified against specific requirements
- The simplest solution that meets requirements MUST be preferred over complex alternatives

**Rationale:** YAGNI principles prevent premature optimization and maintain development velocity. However, production deployment requires infrastructure for data persistence, security, and observability. Each production component must justify its necessity against specific requirements (e.g., database for persistence, monitoring for operational visibility).

#### III. Component Isolation

Host and Participant roles have distinct responsibilities and MUST be implemented as separate, decoupled components.

**Rules:**
- Host dashboard MUST control poll lifecycle (create, open, close) independently
- Participant view MUST focus solely on joining, voting, and viewing results
- Room management MUST isolate polls by unique room codes
- User tracking MUST distinguish roles (host vs participant) and enforce permissions

**Rationale:** Role separation enables independent testing, parallel development, and prevents permission bugs. Clear boundaries reduce complexity and improve maintainability.

#### IV. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. No production code may be written until corresponding tests exist and fail.

**Rules:**
- Red-Green-Refactor cycle strictly enforced: Write failing test → Implement → Refactor
- User stories MUST define acceptance scenarios in Given-When-Then format
- Integration tests MUST cover WebSocket event flows (connect, vote, broadcast)
- Contract tests MUST validate APIs and state management
- Tests MUST run successfully before marking any implementation task complete
- All tests MUST pass before creating a commit

**Rationale:** Real-time WebSocket applications have complex state synchronization requirements. TDD catches race conditions, connection handling bugs, and state inconsistencies early. Tests written before code prevent implementation bias and ensure testable design.

#### V. Code Quality Standards (NON-NEGOTIABLE)

Code MUST adhere to consistent style, formatting, and quality standards. Quality checks MUST pass before commits.

**Rules:**
- Linting MUST be configured and enforced (ESLint for JavaScript/TypeScript)
- Code formatting MUST be automated and consistent (Prettier or equivalent)
- Type safety MUST be enabled where applicable (TypeScript strict mode recommended)
- Code quality checks MUST pass before creating any commit
- Pre-commit hooks SHOULD be configured to enforce quality gates automatically
- Code MUST be free of security vulnerabilities flagged by static analysis tools
- Unused imports, variables, and dead code MUST be removed before commit

**Rationale:** Code quality issues compound rapidly in fast-paced development. Automated checks catch bugs, security issues, and inconsistencies before they enter the codebase. Quality gates prevent technical debt accumulation.

#### VI. Incremental Delivery

Features MUST be delivered as independently testable user stories, prioritized by value.

**Rules:**
- User stories MUST be prioritized (P1, P2, P3) in spec.md
- Each user story MUST be independently implementable and testable
- P1 stories MUST be completed before P2 stories begin
- Each story completion MUST include a validation checkpoint
- MVP (P1 story) MUST be demonstrable before expanding scope

**Rationale:** Story-based delivery enables early validation with real users, reduces rework from misaligned requirements, and provides natural rollback points if timeline pressure increases. Prioritization ensures critical features ship first.

### Production Principles (Added v2.0.0)

#### VII. Data Persistence & Reliability (NON-NEGOTIABLE)

Production systems MUST persist data reliably and survive failures without data loss.

**Rules:**
- All critical data (polls, votes, participants) MUST be persisted to durable storage
- System MUST restore complete state after server restart
- Data retention policies MUST be defined and configurable
- Backup and recovery mechanisms MUST be implemented and tested
- Database migrations MUST be automated, reversible, and validated
- Zero data loss during deployments, restarts, or failures

**Rationale:** Production users cannot tolerate data loss. Poll results, participant votes, and session state represent user effort and business value. Persistence enables reliable service and supports features like rejoining polls, viewing historical results, and recovering from failures.

#### VIII. Security First (NON-NEGOTIABLE)

Security is not optional. All user input is untrusted. All production code must defend against common attacks.

**Rules:**
- All user inputs MUST be sanitized to prevent XSS and injection attacks
- All inputs MUST be validated against defined constraints (length, format, allowed characters)
- Rate limiting MUST be implemented per IP address and per resource to prevent abuse
- CORS policies MUST restrict cross-origin requests to whitelisted domains
- Security headers MUST be implemented (CSP, X-Frame-Options, HSTS, etc.)
- All security-relevant events MUST be logged (failed auth, rate limit violations, invalid input)
- Request size limits MUST be enforced to prevent resource exhaustion
- Secrets MUST NEVER be hardcoded or stored in plain text

**Rationale:** Public internet exposure invites malicious actors. Common attacks (XSS, injection, DDoS) are preventable with standard defenses. Security vulnerabilities damage user trust and can lead to data breaches. Defense-in-depth approach provides multiple security layers.

#### IX. Observability & Monitoring

Production systems MUST provide visibility into health, errors, and performance. Teams cannot fix what they cannot see.

**Rules:**
- Structured logs MUST be generated with consistent format (timestamp, level, message, context)
- Correlation IDs MUST be assigned to requests and propagated through all log entries
- Metrics MUST be exposed for request count, error rate, response time, and active connections
- Health check endpoints MUST indicate service and dependency status
- Error rates MUST be tracked and categorized (client errors, server errors, timeouts)
- Centralized logging and metrics platforms MUST be integrated
- Log levels MUST be configurable without service restart
- Alerts MUST be configured for critical errors and performance degradation

**Rationale:** Operational visibility enables proactive issue detection, rapid diagnosis, and data-driven optimization. Logs without correlation IDs are difficult to trace. Metrics without alerts are ignored. Observability is not overhead—it's essential for maintaining production services.

#### X. Deployment Excellence

Deployments MUST be automated, safe, and repeatable. Manual deployments are error-prone and slow.

**Rules:**
- Containerized deployment MUST be supported with isolated dependencies
- All environment-specific configuration MUST be externalized (database URLs, ports, feature flags)
- Secrets MUST be loaded from secure secret management systems
- Automated CI/CD pipeline MUST include test, build, and deploy stages
- Automated tests (unit, integration, contract) MUST run before deployment
- Zero-downtime deployments MUST be supported with graceful shutdown
- Configuration MUST be validated at startup and fail fast if invalid
- Deployment rollback MUST be automated and tested
- Deployment status MUST be visible to the team in real-time

**Rationale:** Manual deployments do not scale. Automation reduces human error, accelerates deployment frequency, and enables continuous delivery. Configuration errors caught at startup prevent runtime failures. Rollback capability provides safety net for failed deployments.

#### XI. Scalability & Performance

Systems MUST scale to meet demand. Performance is a feature, not an afterthought.

**Rules:**
- Horizontal scaling MUST be supported with multiple concurrent instances
- Session state MUST be shared across instances using distributed cache or database
- Load balancers MUST distribute traffic with health checks and failover
- WebSocket connections MUST work consistently across multiple instances
- Connection pooling MUST be used for database access
- Read replicas SHOULD be supported for database queries to distribute load
- Performance targets MUST be defined and measured (response time, throughput, latency)
- Performance regressions MUST be detected in CI pipeline

**Rationale:** User bases grow. Single-instance architectures hit limits. Horizontal scaling enables growth without rewrites. Performance impacts user experience and operational costs. Measuring performance without targets is meaningless.

#### XII. Resilience & Error Handling

Systems MUST handle failures gracefully. Failures are inevitable; chaos is optional.

**Rules:**
- Retry logic with exponential backoff MUST be implemented for transient failures
- Circuit breakers MUST be implemented for external dependencies
- Timeout limits MUST be defined and enforced for all external operations
- Graceful degradation MUST be provided when non-critical features fail
- User-friendly error messages MUST be returned (never stack traces or internal details)
- WebSocket reconnection MUST be attempted automatically with backoff strategy
- Request queuing and load shedding MUST be implemented under high load
- Error recovery paths MUST be tested (not just happy paths)

**Rationale:** Distributed systems fail in complex ways. Network calls timeout. Databases disconnect. Services crash. Users tolerate failures when systems recover gracefully. Stack traces confuse users. Circuit breakers prevent cascading failures. Resilience patterns are the difference between degraded service and complete outage.

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
- Project structure MUST be documented (backend/frontend split for web app)

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

**Version**: 2.0.0 | **Ratified**: 2025-11-07 | **Last Amended**: 2025-11-07
