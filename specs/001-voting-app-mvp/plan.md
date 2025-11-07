# Implementation Plan: Voting App MVP

**Branch**: `001-voting-app-mvp` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-voting-app-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Real-time voting application enabling hosts to create polls and audiences to vote via WebSocket-based live synchronization. Hosts create polls with 2-5 answer options, receive unique room codes, and control voting lifecycle (open/close) while viewing live results. Participants join using room codes and nicknames, submit votes with instant confirmation, and see real-time result updates. System supports up to 20 concurrent participants per poll with <2 second update latency. MVP uses in-memory storage for 2-5 day development timeline targeting small group presentations (5-20 people).

## Technical Context

**Language/Version**: Node.js 18+ (LTS), JavaScript/TypeScript (TypeScript recommended per constitution)
**Primary Dependencies**: Express 4.x (web server), Socket.io 4.x (WebSocket communication), nanoid or shortid (room code generation)
**Storage**: In-memory (JavaScript Map/Object) - no database for MVP
**Testing**: Jest (unit/integration), Socket.io-client (WebSocket testing), Supertest (HTTP endpoint testing)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - modern evergreen), Node.js server (Linux/macOS/Windows)
**Project Type**: Web application (backend + frontend split)
**Performance Goals**: <2s vote broadcast latency, <1s poll state change sync, 20 concurrent users per poll, <30s poll creation, <1min join-to-vote flow
**Constraints**: <2s p95 WebSocket event latency, graceful reconnection within 5s, in-memory storage cleared on server restart
**Scale/Scope**: Single poll per host session, 20 participants max per poll, short-lived polls (minutes-hours), no persistence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Answer each question based on the current feature requirements:

**I. Real-time First** ✅
- Does this feature require real-time state synchronization? **YES** - Core value proposition is live polling with instant vote updates
- If yes, are WebSocket events planned for all state changes? **YES** - Vote submissions, poll state changes (open/close), participant join/leave, vote count updates
- Are connection/disconnection events tracked? **YES** - FR-015, FR-018 require notification and graceful handling of connection events

**II. Simplicity & MVP Focus** ✅
- Is in-memory storage sufficient for this feature? **YES** - FR-019 explicitly specifies in-memory storage for MVP, aligns with 2-5 day timeline and 5-20 person scale
- Are all external dependencies necessary and justified? **YES** - Express (web server standard), Socket.io (WebSocket requirement per Principle I), nanoid (lightweight room code generation)
- Are there any architectural patterns (repositories, ORMs) being introduced? **NO** - Direct in-memory Map access, no abstraction layers

**III. Component Isolation** ✅
- Are Host and Participant responsibilities clearly separated? **YES** - P1 (Host), P2 (Participant) user stories with distinct acceptance scenarios
- Does this feature maintain role-based permission boundaries? **YES** - FR-005 (host controls state), FR-006/FR-007 (participant voting), host-only dashboard vs participant-only voting view
- Are room isolation requirements satisfied? **YES** - FR-002 (unique room codes), FR-004 (nickname uniqueness per room), FR-016 (20 participant limit per room)

**IV. Test-Driven Development** ✅
- Are acceptance scenarios defined in Given-When-Then format in spec.md? **YES** - 15 scenarios across 3 user stories in spec.md lines 20-60
- Are integration tests planned for WebSocket flows? **YES** - Will cover connect, vote, broadcast, state change events per FR-009, FR-014, FR-015
- Are contract tests planned for APIs? **YES** - Will validate poll creation, room code validation, vote submission, participant management endpoints
- Is TDD workflow (write tests → fail → implement → pass) reflected in tasks.md? **PENDING** - Will be enforced in tasks.md (not yet generated)

**V. Code Quality Standards** ⚠️
- Are linting and formatting tools configured (ESLint, Prettier)? **NOT YET** - Will be configured in Phase 0 research
- Is TypeScript strict mode enabled (if applicable)? **NOT YET** - Will research TypeScript adoption decision in Phase 0
- Are pre-commit hooks configured for quality gates? **NOT YET** - Will be configured during project initialization

**VI. Incremental Delivery** ✅
- Are user stories prioritized (P1, P2, P3) in spec.md? **YES** - P1 (Host), P2 (Participant), P3 (Live Results) in spec.md
- Is each story independently testable? **YES** - Each story has "Independent Test" section describing standalone validation
- Is MVP (P1) clearly defined and demonstrable? **YES** - P1 delivers complete host poll lifecycle with room code generation

**Overall Status**: ⚠️ NEEDS ATTENTION (Code quality tooling pending - will be resolved in Phase 0)

*Code quality tools (ESLint, Prettier, TypeScript decision, pre-commit hooks) will be researched and configured as first tasks in Phase 0. This is standard project initialization and does not represent a constitution violation.*

## Project Structure

### Documentation (this feature)

```text
specs/001-voting-app-mvp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── poll-api.yaml    # OpenAPI spec for poll endpoints
│   └── websocket-events.md  # Socket.io event contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Poll.js          # Poll entity (room code, question, options, state, votes)
│   │   ├── Participant.js   # Participant entity (nickname, connection, role, vote)
│   │   └── PollManager.js   # In-memory poll storage and lifecycle management
│   ├── services/
│   │   ├── roomCodeGenerator.js  # Unique room code generation
│   │   └── voteTracker.js        # Vote counting and percentage calculation
│   ├── api/
│   │   ├── routes/
│   │   │   ├── pollRoutes.js     # POST /api/polls, GET /api/polls/:roomCode
│   │   │   └── healthRoutes.js   # GET /health
│   │   └── middleware/
│   │       ├── errorHandler.js   # Centralized error responses
│   │       └── validator.js      # Request validation (question, options, room codes)
│   ├── sockets/
│   │   ├── socketHandler.js      # Main Socket.io connection handler
│   │   ├── events/
│   │   │   ├── joinRoom.js       # Handle participant join with nickname uniqueness
│   │   │   ├── submitVote.js     # Handle vote submission and broadcast
│   │   │   ├── changePollState.js # Handle host open/close voting
│   │   │   └── disconnect.js     # Handle connection cleanup
│   │   └── emitters/
│   │       ├── broadcastVoteUpdate.js  # Emit vote counts to room
│   │       └── broadcastStateChange.js # Emit poll state changes
│   ├── config/
│   │   └── index.js              # Environment config (PORT, CORS origins)
│   └── server.js                 # Express + Socket.io server initialization
├── tests/
│   ├── contract/
│   │   ├── pollApi.test.js       # Poll creation, room code validation
│   │   └── websocket.test.js     # Socket.io event contracts
│   ├── integration/
│   │   ├── hostFlow.test.js      # End-to-end host poll lifecycle
│   │   ├── participantFlow.test.js # End-to-end participant join-vote
│   │   └── realTimeSync.test.js  # Multi-client vote synchronization
│   └── unit/
│       ├── PollManager.test.js
│       ├── roomCodeGenerator.test.js
│       └── voteTracker.test.js
├── package.json
├── .eslintrc.js (or .json)
├── .prettierrc (or .json)
├── tsconfig.json (if TypeScript adopted)
└── jest.config.js

frontend/
├── src/
│   ├── pages/
│   │   ├── HostDashboard.js      # Poll creation form, control buttons, results display
│   │   ├── JoinPage.js           # Room code + nickname entry form
│   │   └── VotePage.js           # Question display, option selection, vote confirmation
│   ├── components/
│   │   ├── PollResults.js        # Bar chart/percentage display of vote counts
│   │   ├── ParticipantCounter.js # Live participant count display
│   │   ├── PollControls.js       # Open/Close voting buttons (host only)
│   │   └── VoteConfirmation.js   # Toast/modal for vote success feedback
│   ├── services/
│   │   ├── socketService.js      # Socket.io-client connection management
│   │   └── apiService.js         # HTTP client for poll creation/validation
│   ├── utils/
│   │   └── roomCodeFormatter.js  # Display formatting for room codes
│   ├── App.js                    # Main routing and layout
│   └── index.js                  # Entry point
├── public/
│   └── index.html
├── tests/
│   ├── integration/
│   │   └── userFlows.test.js     # E2E tests with socket connections
│   └── unit/
│       └── components.test.js    # Component rendering tests
├── package.json
├── .eslintrc.js
└── .prettierrc

shared/ (optional - if types/constants shared)
└── eventTypes.js  # Socket.io event name constants

.husky/ (pre-commit hooks)
├── pre-commit    # Run linting, formatting, tests
└── _/            # Husky internals
```

**Structure Decision**: Web application structure (Option 2) selected based on:
- Separate backend (Node.js + Socket.io server) and frontend (browser client) deployment targets
- Independent testing requirements for server-side logic and client-side UI
- Constitution Principle III (Component Isolation) - host and participant views in separate frontend pages
- Backend handles business logic, WebSocket broadcasting, and in-memory storage
- Frontend handles UI, user input validation, and Socket.io-client connections
- Shared directory for event name constants to avoid string duplication

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations to track.** Constitution Check status is ⚠️ NEEDS ATTENTION only for pending code quality tool configuration, which is standard project initialization and will be resolved in Phase 0 research. No architectural patterns, external dependencies, or complexity additions that violate constitution principles.

---

## Post-Design Constitution Check ✅

**Re-evaluated after Phase 1 (Design & Contracts) completion**

**I. Real-time First** ✅
- WebSocket events defined for all state changes: ✅ (see contracts/websocket-events.md)
- Vote submissions, poll state changes, participant join/leave all use Socket.io broadcasts
- Acknowledgments configured for instant confirmation per FR-012
- Reconnection strategy documented in research.md

**II. Simplicity & MVP Focus** ✅
- In-memory storage confirmed (PollManager.js using JavaScript Map)
- Zero architectural patterns: Direct Map access, no repositories/ORMs
- Dependencies justified: Express (standard), Socket.io (required), nanoid (minimal), pino (fast logging)
- No database, no auth framework, no microservices

**III. Component Isolation** ✅
- Backend: Host/Participant logic separated in socket event handlers (see data-model.md)
- Frontend: Distinct pages (HostDashboard.js, JoinPage.js, VotePage.js) per plan structure
- Room codes isolate polls (FR-002, unique 6-char codes)
- Permission boundaries enforced (hostSocketId validation in PollManager)

**IV. Test-Driven Development** ✅
- Acceptance scenarios defined in spec.md (15 scenarios)
- Test layers planned: unit (PollManager), integration (realTimeSync), contract (websocket)
- TDD workflow documented in quickstart.md: Write tests → Fail → Implement → Pass
- Jest + Socket.io-client configured per research.md

**V. Code Quality Standards** ✅ **[RESOLVED]**
- Linting configured: ESLint + Airbnb style guide (research.md section 2)
- Formatting configured: Prettier with singleQuote, 100 char width (research.md section 2)
- Pre-commit hooks configured: Husky + lint-staged (research.md section 3)
- TypeScript decision made: JavaScript + JSDoc for MVP (research.md section 1)
- Security: Pino logging for error visibility, input validation in PollManager

**VI. Incremental Delivery** ✅
- User stories prioritized P1 → P2 → P3 in spec.md
- Each story independently testable (see spec.md "Independent Test" sections)
- MVP clearly defined: P1 (Host poll lifecycle) demonstrable standalone
- Tasks will follow story order per constitution Principle VI

**Overall Status**: ✅ **PASS** (All principles satisfied, all tools configured)

**Phase 0 Resolution Summary**:
- ESLint + Prettier + Husky configured (see research.md sections 2-3)
- JavaScript chosen over TypeScript for MVP speed (research.md section 1)
- All NEEDS CLARIFICATION items from Technical Context resolved

**Ready for `/speckit.tasks` generation.**
