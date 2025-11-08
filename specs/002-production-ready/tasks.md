# Tasks: Production-Ready Infrastructure

**Input**: Design documents from `/specs/002-production-ready/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per TDD workflow (Constitution Principle IV)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `backend/tests/`
- All paths shown below are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Development environment and Docker infrastructure

- [X] T001 Create docker-compose.yml with PostgreSQL, Redis, Prometheus, Grafana services per quickstart.md
- [X] T002 Create backend/prometheus.yml configuration file for metrics scraping
- [X] T003 [P] Create backend/grafana/datasources/prometheus.yml for auto-provisioned datasource
- [X] T004 [P] Create backend/.env.example with all configuration variables from quickstart.md
- [X] T005 [P] Update backend/package.json with new production dependencies (pg, ioredis, @socket.io/redis-adapter, prom-client, joi, xss, express-rate-limit, rate-limit-redis, helmet)
- [X] T006 Install dependencies with npm install in backend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create backend/src/config/database.js for PostgreSQL connection pooling (20 connections max)
- [X] T008 [P] Create backend/src/config/cache.js for Redis client configuration with retry strategy
- [X] T009 [P] Install and configure db-migrate for database migrations in backend/
- [X] T010 Create backend/src/migrations/001_initial_schema.js with polls, participants, votes tables per data-model.md
- [X] T011 Run migration to create database schema: npm run migrate:up
- [X] T012 [P] Enhance backend/src/config/logger.js to support correlation IDs and structured logging
- [X] T013 [P] Create backend/src/api/middleware/correlationId.js to assign correlation IDs to all requests
- [X] T014 Update backend/src/server.js to initialize database connection pool at startup
- [X] T015 [P] Update backend/src/server.js to initialize Redis connection at startup

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Data Persistence and Recovery (Priority: P1) 🎯 MVP

**Goal**: Enable polls to persist across server restarts with zero data loss

**Independent Test**: Create poll, submit votes, restart server, verify data intact

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Contract test for persisted poll creation in backend/tests/contract/pollPersistence.test.js
- [ ] T017 [P] [US1] Contract test for vote persistence in backend/tests/contract/votePersistence.test.js
- [ ] T018 [P] [US1] Integration test for participant reconnection in backend/tests/integration/participantReconnection.test.js
- [ ] T019 [P] [US1] Integration test for server restart recovery in backend/tests/integration/serverRestartRecovery.test.js

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create backend/src/models/repositories/PollRepository.js with createPoll, getPollByRoomCode, updatePollState, expireOldPolls methods
- [ ] T021 [P] [US1] Create backend/src/models/repositories/ParticipantRepository.js with addParticipant, getParticipantsByPoll, updateSocketId, markDisconnected methods
- [ ] T022 [P] [US1] Create backend/src/models/repositories/VoteRepository.js with submitVote (upsert), getVotesByPoll, getVoteCountsByPoll methods
- [ ] T023 [US1] Create backend/src/services/pollService.js business logic layer wrapping repository calls with error handling
- [ ] T024 [US1] Update backend/src/api/routes/pollRoutes.js to use pollService instead of PollManager
- [ ] T025 [US1] Update backend/src/sockets/events/joinRoom.js to persist participant to database via ParticipantRepository
- [ ] T026 [US1] Update backend/src/sockets/events/submitVote.js to persist vote to database via VoteRepository
- [ ] T027 [US1] Update backend/src/sockets/events/changePollState.js to persist state changes to database via PollRepository
- [ ] T028 [US1] Update backend/src/sockets/socketHandler.js to handle participant reconnection by updating socket_id in database
- [ ] T029 [US1] Implement poll data restoration on server startup in backend/src/server.js to load active polls from database
- [ ] T030 [US1] Add logging for all database operations in repositories (create, update, reconnect events)
- [ ] T031 [US1] Run tests T016-T019 and verify they pass

**Checkpoint**: User Story 1 complete - polls persist across restarts with zero data loss

---

## Phase 4: User Story 2 - Security and Input Validation (Priority: P2)

**Goal**: Protect against malicious input, abuse, and unauthorized access

**Independent Test**: Attempt XSS injection, rate limit violations, unauthorized actions - verify all are blocked

### Tests for User Story 2

- [ ] T032 [P] [US2] Contract test for input sanitization in backend/tests/contract/inputSanitization.test.js (XSS, script tags, SQL injection patterns)
- [ ] T033 [P] [US2] Contract test for rate limiting in backend/tests/contract/rateLimiting.test.js (global, vote, poll creation limits)
- [ ] T034 [P] [US2] Contract test for CORS validation in backend/tests/contract/corsValidation.test.js
- [ ] T035 [P] [US2] Integration test for security headers in backend/tests/integration/securityHeaders.test.js

### Implementation for User Story 2

- [ ] T036 [P] [US2] Create backend/src/api/middleware/securityHeaders.js using helmet.js for CSP, X-Frame-Options, HSTS headers
- [ ] T037 [P] [US2] Create backend/src/api/middleware/rateLimiter.js with express-rate-limit and Redis store for distributed rate limiting
- [ ] T038 [P] [US2] Create backend/src/schemas/pollSchemas.js with Joi validation schemas for poll creation (question 5-200 chars, 2-5 options)
- [ ] T039 [P] [US2] Create backend/src/schemas/participantSchemas.js with Joi validation schemas for nickname (2-50 chars, alphanumeric)
- [ ] T040 [P] [US2] Create backend/src/schemas/voteSchemas.js with Joi validation schema for vote submission (option_index 0-4)
- [ ] T041 [US2] Update backend/src/api/middleware/validator.js to use Joi schemas and xss library for sanitization
- [ ] T042 [US2] Apply security headers middleware to all routes in backend/src/server.js
- [ ] T043 [US2] Apply rate limiting middleware: global (100 req/15min), vote (10/min), poll creation (5/hour) in backend/src/server.js
- [ ] T044 [US2] Update CORS configuration in backend/src/server.js to whitelist allowed origins from environment variable
- [ ] T045 [US2] Add request size limits (100kb) to Express in backend/src/server.js
- [ ] T046 [US2] Create backend/src/migrations/002_audit_logs.js for security event logging per data-model.md
- [ ] T047 [US2] Run migration: npm run migrate:up
- [ ] T048 [US2] Create backend/src/models/repositories/AuditLogRepository.js for logging security events
- [ ] T049 [US2] Update rate limiter middleware to log violations to audit_logs table
- [ ] T050 [US2] Update validator middleware to log invalid input attempts to audit_logs table
- [ ] T051 [US2] Run tests T032-T035 and verify they pass
- [ ] T052 [P] [US2] Create backend/src/schemas/hostAuthSchemas.js with Joi validation for host authentication credentials
- [ ] T053 [US2] Implement backend/src/api/middleware/hostAuth.js optional authentication middleware for poll control actions using JWT tokens
- [ ] T054 [US2] Add host authentication endpoints (POST /api/auth/host/login, POST /api/auth/host/verify) in backend/src/api/routes/authRoutes.js
- [ ] T055 [US2] Update backend/src/sockets/events/changePollState.js to check host authentication when HOST_AUTH_ENABLED=true
- [ ] T056 [US2] Add HOST_AUTH_ENABLED, HOST_AUTH_SECRET environment variables to backend/.env.example

**Checkpoint**: User Story 2 complete - system protected against attacks and abuse with optional host authentication

---

## Phase 5: User Story 3 - Monitoring and Observability (Priority: P3)

**Goal**: Enable operational visibility through logs, metrics, and alerts

**Independent Test**: Trigger errors, generate load, verify logs/metrics/alerts generated correctly

### Tests for User Story 3

- [ ] T057 [P] [US3] Contract test for /metrics endpoint format in backend/tests/contract/metricsEndpoint.test.js (Prometheus format validation)
- [ ] T058 [P] [US3] Contract test for /api/health endpoint in backend/tests/contract/healthCheck.test.js per health-check-contract.yaml
- [ ] T059 [P] [US3] Contract test for /api/health/ready endpoint in backend/tests/contract/readinessCheck.test.js
- [ ] T060 [P] [US3] Contract test for /api/health/live endpoint in backend/tests/contract/livenessCheck.test.js
- [ ] T061 [US3] Integration test for correlation ID propagation in backend/tests/integration/correlationIdTracking.test.js

### Implementation for User Story 3

- [ ] T062 [P] [US3] Create backend/src/services/metricsService.js to initialize prom-client and define all metrics per metrics-contract.md
- [ ] T063 [P] [US3] Create backend/src/api/routes/metricsRoutes.js with GET /metrics endpoint exposing Prometheus metrics
- [ ] T064 [US3] Create backend/src/api/middleware/metricsMiddleware.js to instrument HTTP requests (duration, count, status codes)
- [ ] T065 [US3] Update backend/src/sockets/socketHandler.js to track WebSocket connection metrics (current, total, messages by event)
- [ ] T066 [US3] Create database query wrapper in backend/src/config/database.js to track query metrics (duration, count by operation/table)
- [ ] T067 [US3] Update all repository methods to use query wrapper for automatic instrumentation
- [ ] T068 [US3] Instrument business metrics in pollService: polls_total, polls_active, votes_total, participants_total
- [ ] T069 [US3] Instrument rate limit exceeded counter in rateLimiter middleware
- [ ] T070 [US3] Instrument error counters in errorHandler middleware by error type and source
- [ ] T071 [US3] Update backend/src/api/routes/healthRoutes.js to implement enhanced health check per health-check-contract.yaml
- [ ] T072 [US3] Add /api/health/ready endpoint checking database pool availability and Redis connectivity
- [ ] T073 [US3] Add /api/health/live endpoint with minimal checks (always returns 200 if process responsive)
- [ ] T074 [US3] Create backend/grafana/dashboards/zephyr-overview.json with panels for RPS, error rate, P95 response time, active connections, DB performance
- [ ] T075 [US3] Configure Prometheus alert rules for high error rate, slow queries, high memory usage in backend/prometheus-alerts.yml
- [ ] T076 [US3] Update logger to include correlation IDs in all log entries for request tracing
- [ ] T077 [US3] Run tests T057-T061 and verify they pass
- [ ] T078 [US3] Create backend/src/api/routes/configRoutes.js with GET /api/config/log-level and PUT /api/config/log-level endpoints
- [ ] T079 [US3] Implement runtime log level updates in backend/src/config/logger.js (support changing between debug, info, warn, error without restart)
- [ ] T080 [US3] Add authentication/authorization to config endpoints (restrict to admin users or internal network only)

**Checkpoint**: User Story 3 complete - full operational visibility with metrics, health checks, and runtime configuration

---

## Phase 6: User Story 4 - Deployment Automation and Configuration (Priority: P4)

**Goal**: Enable reliable automated deployments with environment-specific configuration

**Independent Test**: Trigger deployment pipeline, verify tests run, build succeeds, deployment proceeds

### Tests for User Story 4

- [ ] T081 [P] [US4] Contract test for environment configuration loading in backend/tests/contract/configValidation.test.js
- [ ] T082 [US4] Integration test for graceful shutdown in backend/tests/integration/gracefulShutdown.test.js (SIGTERM handling, connection draining)

### Implementation for User Story 4

- [ ] T083 [P] [US4] Create backend/Dockerfile for containerized Node.js application (multi-stage build, production dependencies only)
- [ ] T084 [P] [US4] Create backend/.dockerignore to exclude node_modules, tests, .env files
- [ ] T085 [US4] Enhance backend/src/config/index.js to validate all required environment variables at startup (fail fast if invalid)
- [ ] T086 [US4] Create backend/src/config/secrets.js abstraction layer supporting env, AWS Secrets Manager, Vault per research.md
- [ ] T087 [US4] Update backend/src/server.js to implement graceful shutdown on SIGTERM (close connections, drain requests, timeout 30s)
- [ ] T088 [US4] Create .github/workflows/test.yml for automated testing on push (run linter, unit tests, integration tests)
- [ ] T089 [US4] Create .github/workflows/build.yml for Docker image builds (build multi-arch, tag with commit SHA and branch name)
- [ ] T090 [US4] Create .github/workflows/deploy.yml for deployment automation (run migrations, deploy containers, health check validation, rollback on failure)
- [ ] T091 [US4] Create backend/.env.production template with production configuration variables
- [ ] T092 [US4] Update backend/package.json with scripts for migration commands (migrate:up, migrate:down, migrate:status)
- [ ] T093 [US4] Document deployment process in backend/README.md (local, staging, production environments)
- [ ] T094 [US4] Run tests T081-T082 and verify they pass

**Checkpoint**: User Story 4 complete - fully automated deployment pipeline with configuration management

---

## Phase 7: User Story 5 - Horizontal Scalability (Priority: P5)

**Goal**: Support multiple backend instances with consistent real-time updates across all instances

**Independent Test**: Deploy multiple instances, connect participants to different instances, verify consistent updates

### Tests for User Story 5

- [ ] T095 [P] [US5] Integration test for multi-instance WebSocket consistency in backend/tests/integration/multiInstanceWebSocket.test.js
- [ ] T096 [US5] Performance test for distributed session state in backend/tests/performance/distributedSessions.test.js

### Implementation for User Story 5

- [ ] T097 [US5] Create backend/src/sockets/adapter.js to configure Socket.io Redis adapter for multi-instance message broadcasting
- [ ] T098 [US5] Update backend/src/sockets/socketHandler.js to use Redis adapter for cross-instance communication
- [ ] T099 [US5] Create backend/src/services/sessionService.js to store participant session state in Redis (socket_id, poll_id, last_seen)
- [ ] T100 [US5] Update backend/src/sockets/events/joinRoom.js to store session in Redis for cross-instance access
- [ ] T101 [US5] Update backend/src/sockets/socketHandler.js disconnect handler to update session state in Redis
- [ ] T102 [US5] Update backend/src/sockets/emitters/broadcastVoteUpdate.js to use Redis pub/sub for cross-instance broadcasting
- [ ] T103 [US5] Update backend/src/sockets/emitters/broadcastStateChange.js to use Redis pub/sub for cross-instance broadcasting
- [ ] T104 [US5] Configure sticky sessions in load balancer documentation (or implement session affinity alternative)
- [ ] T105 [US5] Update docker-compose.yml to support running multiple backend instances (scale: 3)
- [ ] T106 [US5] Document horizontal scaling architecture in backend/docs/scaling.md (load balancer setup, Redis adapter, session management)
- [ ] T107 [US5] Run tests T095-T096 and verify they pass

**Checkpoint**: User Story 5 complete - application scales horizontally across multiple instances

---

## Phase 8: User Story 6 - Resilience and Error Handling (Priority: P6)

**Goal**: Gracefully handle failures with automatic retries, circuit breakers, and user-friendly errors

**Independent Test**: Simulate database timeout, network errors, invalid state - verify graceful recovery and helpful feedback

### Tests for User Story 6

- [ ] T108 [P] [US6] Integration test for database retry logic in backend/tests/integration/databaseRetry.test.js (simulate timeout, verify exponential backoff)
- [ ] T109 [P] [US6] Integration test for WebSocket reconnection in backend/tests/integration/websocketReconnection.test.js
- [ ] T110 [US6] Integration test for circuit breaker behavior in backend/tests/integration/circuitBreaker.test.js

### Implementation for User Story 6

- [ ] T111 [P] [US6] Create backend/src/services/resilienceService.js with retry logic (exponential backoff: 100ms, 200ms, 400ms, 800ms, max 5 attempts)
- [ ] T112 [P] [US6] Create backend/src/utils/circuitBreaker.js implementing circuit breaker pattern for external dependencies (open after 5 failures, half-open after 30s)
- [ ] T113 [US6] Wrap all database queries in retry logic with exponential backoff for transient failures (connection timeout, deadlock)
- [ ] T114 [US6] Wrap Redis operations in retry logic for connection errors
- [ ] T115 [US6] Implement circuit breaker for database connection in backend/src/config/database.js
- [ ] T116 [US6] Implement circuit breaker for Redis connection in backend/src/config/cache.js
- [ ] T117 [US6] Add timeout limits to all database queries (2s default, configurable via DB_QUERY_TIMEOUT)
- [ ] T118 [US6] Add timeout limits to all Redis operations (1s default, configurable via REDIS_TIMEOUT)
- [ ] T119 [US6] Update backend/src/api/middleware/errorHandler.js to return user-friendly error messages (no stack traces in production)
- [ ] T120 [US6] Implement WebSocket reconnection logic in backend/src/sockets/socketHandler.js (client-side reconnect with backoff)
- [ ] T121 [US6] Create frontend/src/utils/websocketReconnect.js for automatic client reconnection with exponential backoff
- [ ] T122 [US6] Implement request queuing in backend/src/api/middleware/loadShedding.js when under high load (reject with 503 and Retry-After header when queue full)
- [ ] T123 [US6] Add graceful degradation for non-critical features (metrics collection, audit logging) - continue operation if they fail
- [ ] T124 [US6] Run tests T108-T110 and verify they pass

**Checkpoint**: User Story 6 complete - system handles failures gracefully with automatic recovery

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories

- [ ] T125 [P] Update backend/README.md with production deployment instructions, architecture diagrams, operational runbooks
- [ ] T126 [P] Update CLAUDE.md with production-ready technologies and commands from plan.md
- [ ] T127 [P] Create backend/docs/runbook.md with incident response procedures, common issues, troubleshooting steps
- [ ] T128 [P] Create backend/docs/architecture.md with system architecture diagrams (multi-instance, database, caching, monitoring)
- [ ] T129 [P] Create backend/docs/backup-procedures.md documenting PostgreSQL backup strategies (automated RDS backups, pg_dump manual backups, PITR recovery steps, backup retention policy, restore testing procedures)
- [ ] T130 Code cleanup: Remove old PollManager in-memory implementation from backend/src/models/PollManager.js (replace with note redirecting to repositories)
- [ ] T131 Run full test suite with coverage: npm test -- --coverage (verify ≥90% coverage maintained)
- [ ] T132 Run quickstart.md validation (follow all steps, verify local environment works)
- [ ] T133 Perform security audit: npm audit, review dependencies for vulnerabilities
- [ ] T134 Update backend/package.json version to 2.0.0 (production-ready release)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in priority order: P1 → P2 → P3 → P4 → P5 → P6
  - P1 (Data Persistence) is foundational for production readiness
  - P2-P3 can start after P1 completes
  - P4-P6 can proceed in parallel with P2-P3 if staffed
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 - Depends on database being configured (audit logs table)
- **User Story 3 (P3)**: Can start after US1 - Can run in parallel with US2
- **User Story 4 (P4)**: Can start after US1 - Can run in parallel with US2/US3
- **User Story 5 (P5)**: Can start after US1 - Depends on database and Redis from US1
- **User Story 6 (P6)**: Can start after US1 - Should come after US2 (resilience for security features)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Repository classes before services
- Services before route/socket updates
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T003, T004, T005 can run in parallel
**Phase 2 (Foundational)**: T008, T009, T012, T013, T015 can run in parallel after T007

**Within User Stories**:
- All tests for each story can run in parallel
- Multiple repository classes can be built in parallel (T020-T022 for US1)
- Multiple schema files can be created in parallel (T038-T040 for US2)
- Multiple middleware files can be created in parallel
- Different user stories can be worked on in parallel by different team members after US1 completes

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for persisted poll creation in backend/tests/contract/pollPersistence.test.js"
Task: "Contract test for vote persistence in backend/tests/contract/votePersistence.test.js"
Task: "Integration test for participant reconnection in backend/tests/integration/participantReconnection.test.js"
Task: "Integration test for server restart recovery in backend/tests/integration/serverRestartRecovery.test.js"

# Launch all repository classes together:
Task: "Create backend/src/models/repositories/PollRepository.js"
Task: "Create backend/src/models/repositories/ParticipantRepository.js"
Task: "Create backend/src/models/repositories/VoteRepository.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T015) - CRITICAL
3. Complete Phase 3: User Story 1 (T016-T031)
4. **STOP and VALIDATE**: Test data persistence independently
5. Deploy/demo if ready - **Production-ready persistence achieved!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Data Persistence) → Test independently → **MVP - Zero data loss!**
3. Add User Story 2 (Security) → Test independently → **Protected from attacks**
4. Add User Story 3 (Monitoring) → Test independently → **Operational visibility**
5. Add User Story 4 (Deployment) → Test independently → **Automated deployments**
6. Add User Story 5 (Scalability) → Test independently → **Horizontal scaling**
7. Add User Story 6 (Resilience) → Test independently → **Graceful failure handling**
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Everyone focuses on User Story 1 (critical path)
3. After US1 complete:
   - Developer A: User Story 2 (Security)
   - Developer B: User Story 3 (Monitoring)
   - Developer C: User Story 4 (Deployment)
4. After US2-US4 complete:
   - Developer A: User Story 5 (Scalability)
   - Developer B: User Story 6 (Resilience)
   - Developer C: Polish tasks
5. Stories complete and integrate independently

---

## Task Summary

**Total Tasks**: 134 tasks
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 9 tasks
- Phase 3 (US1 - Data Persistence): 16 tasks (4 tests + 12 implementation)
- Phase 4 (US2 - Security): 25 tasks (4 tests + 21 implementation) - includes optional host authentication
- Phase 5 (US3 - Monitoring): 24 tasks (5 tests + 19 implementation) - includes runtime log level configuration
- Phase 6 (US4 - Deployment): 14 tasks (2 tests + 12 implementation)
- Phase 7 (US5 - Scalability): 13 tasks (2 tests + 11 implementation)
- Phase 8 (US6 - Resilience): 17 tasks (3 tests + 14 implementation)
- Phase 9 (Polish): 10 tasks - includes backup procedure documentation

**Parallel Opportunities**: 45 tasks marked [P] for parallel execution

**Independent Test Criteria**:
- US1: Create poll, restart server, verify data persists
- US2: Attempt XSS/rate limit violations, verify blocked
- US3: Trigger errors, check metrics/logs generated
- US4: Run deployment pipeline, verify automated
- US5: Deploy multiple instances, verify consistency
- US6: Simulate failures, verify graceful recovery

**Suggested MVP Scope**: Complete through User Story 1 (Data Persistence) - Delivers production-ready persistence with zero data loss

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written first (TDD workflow per Constitution Principle IV)
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Foundation (Phase 2) is the critical path - blocks all user stories
- User Story 1 (Data Persistence) is the MVP - most critical for production
