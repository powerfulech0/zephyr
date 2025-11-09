# zephyr Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-07

## Active Technologies
- Node.js 18+ (LTS) / JavaScript ES6+ (002-production-ready)

### Backend (001-voting-app-mvp + 002-production-ready)

**Runtime & Language:**
- Node.js 18+ (LTS)
- JavaScript (ES6+)

**Core Dependencies:**
- Express 4.x - Web server and REST API
- Socket.io 4.x - WebSocket real-time communication
- @socket.io/redis-adapter 8.x - Multi-instance WebSocket support
- nanoid - Secure room code generation
- pino - Structured logging
- pino-http - HTTP request logging middleware
- cors - Cross-Origin Resource Sharing
- dotenv - Environment variable management

**Production Dependencies (002-production-ready):**
- pg 8.x - PostgreSQL client for data persistence
- ioredis 5.x - Redis client for caching and session management
- prom-client 15.x - Prometheus metrics for monitoring
- joi 17.x - Schema validation and input validation
- xss 1.x - XSS sanitization
- express-rate-limit 7.x - Rate limiting middleware
- rate-limit-redis 4.x - Distributed rate limiting with Redis
- helmet 7.x - Security headers middleware
- db-migrate - Database migration management

**Development Dependencies:**
- Jest 30.x - Testing framework
- ESLint - Linting with Airbnb style guide
- Prettier - Code formatting
- Husky - Git hooks
- lint-staged - Pre-commit validation
- socket.io-client - WebSocket testing
- supertest - HTTP API testing
- nodemon - Development auto-reload

**Infrastructure (002-production-ready):**
- PostgreSQL 14+ - Relational database for persistence
- Redis 7+ - In-memory cache and session store
- Prometheus 2.45+ - Metrics collection and monitoring
- Grafana 10+ - Metrics visualization and dashboards
- Docker & Docker Compose - Containerization
- GitHub Actions - CI/CD automation

## Project Structure

```text
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Centralized error handling (enhanced)
│   │   │   ├── validator.js         # Request validation with Joi
│   │   │   ├── rateLimiter.js       # Rate limiting middleware (NEW)
│   │   │   ├── securityHeaders.js   # helmet.js security headers (NEW)
│   │   │   ├── correlationId.js     # Request correlation IDs (NEW)
│   │   │   ├── metricsMiddleware.js # HTTP metrics collection (NEW)
│   │   │   ├── hostAuth.js          # Optional host authentication (NEW)
│   │   │   └── loadShedding.js      # Request queuing under load (NEW)
│   │   └── routes/
│   │       ├── healthRoutes.js      # Health check endpoints (enhanced)
│   │       ├── pollRoutes.js        # Poll CRUD endpoints (enhanced)
│   │       ├── metricsRoutes.js     # Prometheus metrics endpoint (NEW)
│   │       ├── configRoutes.js      # Runtime configuration (NEW)
│   │       └── authRoutes.js        # Host authentication (NEW)
│   ├── config/
│   │   ├── index.js                 # Environment configuration (enhanced)
│   │   ├── logger.js                # Pino logger with correlation IDs (enhanced)
│   │   ├── database.js              # PostgreSQL connection pooling (NEW)
│   │   ├── cache.js                 # Redis configuration (NEW)
│   │   └── secrets.js               # Secret management abstraction (NEW)
│   ├── models/
│   │   ├── PollManager.js           # DEPRECATED - Use repositories instead
│   │   └── repositories/            # Data access layer (NEW)
│   │       ├── PollRepository.js        # Database operations for polls
│   │       ├── ParticipantRepository.js # Database operations for participants
│   │       ├── VoteRepository.js        # Database operations for votes
│   │       └── AuditLogRepository.js    # Security event logging
│   ├── services/
│   │   ├── roomCodeGenerator.js     # Unique room code generation
│   │   ├── pollService.js           # Business logic layer (NEW)
│   │   ├── sessionService.js        # Session management (NEW)
│   │   ├── metricsService.js        # Metrics collection (NEW)
│   │   └── resilienceService.js     # Circuit breakers, retry logic (NEW)
│   ├── sockets/
│   │   ├── events/
│   │   │   ├── changePollState.js   # Host state control (enhanced)
│   │   │   ├── joinRoom.js          # Participant join (enhanced)
│   │   │   └── submitVote.js        # Vote submission (enhanced)
│   │   ├── emitters/
│   │   │   ├── broadcastStateChange.js # Broadcast poll state (enhanced)
│   │   │   └── broadcastVoteUpdate.js  # Broadcast vote counts (enhanced)
│   │   ├── socketHandler.js         # Socket.io connection handler (enhanced)
│   │   └── adapter.js               # Socket.io Redis adapter (NEW)
│   ├── schemas/                     # Joi validation schemas (NEW)
│   │   ├── pollSchemas.js
│   │   ├── participantSchemas.js
│   │   ├── voteSchemas.js
│   │   └── hostAuthSchemas.js
│   ├── utils/                       # Utility modules (NEW)
│   │   └── circuitBreaker.js        # Circuit breaker pattern
│   ├── migrations/                  # Database migrations (NEW)
│   │   ├── 001_initial_schema.js
│   │   └── 002_audit_logs.js
│   └── server.js                    # Application entry point (enhanced)
├── docs/                            # Documentation (NEW)
│   ├── runbook.md                   # Incident response procedures
│   ├── architecture.md              # System architecture diagrams
│   └── backup-procedures.md         # Database backup strategies
├── grafana/                         # Grafana configuration (NEW)
│   ├── dashboards/
│   │   └── zephyr-overview.json
│   └── datasources/
│       └── prometheus.yml
├── tests/
│   ├── unit/                        # Unit tests (enhanced)
│   ├── contract/                    # API/WebSocket contract tests (enhanced)
│   ├── integration/                 # Integration tests (enhanced)
│   ├── performance/                 # Performance tests (enhanced)
│   └── e2e/                         # End-to-end tests (NEW)
├── .github/workflows/               # CI/CD pipelines (NEW)
│   ├── test.yml
│   ├── build.yml
│   └── deploy.yml
├── .env                             # Environment variables
├── .env.example                     # Environment template (enhanced)
├── .env.production                  # Production configuration template (NEW)
├── .dockerignore                    # Docker ignore file (NEW)
├── .eslintrc.js                     # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── Dockerfile                       # Container definition (NEW)
├── docker-compose.yml               # Local development stack (NEW)
├── jest.config.js                   # Jest configuration
├── package.json                     # Dependencies and scripts (enhanced)
├── prometheus.yml                   # Prometheus configuration (NEW)
└── prometheus-alerts.yml            # Alert rules (NEW)

shared/
└── eventTypes.js                    # WebSocket event constants

frontend/
└── (not implemented yet)

specs/
├── 001-voting-app-mvp/              # MVP feature specification
│   ├── spec.md
│   ├── plan.md
│   ├── data-model.md
│   ├── tasks.md
│   └── contracts/
└── 002-production-ready/            # Production-ready feature specification (NEW)
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── tasks.md
    ├── quickstart.md
    ├── checklists/
    │   └── requirements.md
    └── contracts/
        ├── health-check-contract.yaml
        └── metrics-contract.md
```

## Commands

### Development
```bash
cd backend
npm start              # Start server with nodemon
npm run dev            # Alias for npm start

# With Docker Compose (includes PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d   # Start all services
npm run migrate:up     # Run database migrations
npm run dev            # Start backend
docker compose down    # Stop all services
```

### Testing
```bash
npm test               # Run all tests with coverage
npm run test:watch     # Run tests in watch mode
npm test -- <file>     # Run specific test file
npm test -- --verbose  # Run with verbose output
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
git commit             # Triggers pre-commit hook (lint-staged)
npm audit              # Security vulnerability scan
```

### Database Migrations
```bash
npm run migrate:up     # Run all pending migrations
npm run migrate:down   # Rollback last migration
npm run migrate:status # Check pending migrations
npm run migrate:create <name> # Create new migration
```

### Production Operations
```bash
# Build Docker image
docker build -t zephyr-backend:latest ./backend

# Run production container
docker run -p 4000:4000 --env-file .env.production zephyr-backend:latest

# Check health
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/ready
curl http://localhost:4000/api/health/live

# View metrics
curl http://localhost:4000/metrics

# Runtime log level configuration
curl -X PUT http://localhost:4000/api/config/log-level -H "Content-Type: application/json" -d '{"level":"debug"}'
```

### Monitoring & Observability
```bash
# Access Grafana dashboards
open http://localhost:3001  # Default: admin/admin

# Access Prometheus
open http://localhost:9090

# View application logs with correlation IDs
docker compose logs -f backend | grep '"correlationId"'
```

### Performance
```bash
npm test -- tests/performance/concurrentParticipants.test.js
# Tests 20 concurrent participants (<2s broadcast latency)

# Load testing (if available)
npm run test:performance
```

## Code Style

### General Guidelines
- **Language:** JavaScript ES6+ (no TypeScript in MVP, reserved for future)
- **Style Guide:** Airbnb JavaScript Style Guide
- **Line Length:** 100 characters (soft limit)
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required

### Naming Conventions
- **Files:** camelCase (e.g., `pollRoutes.js`, `broadcastVoteUpdate.js`)
- **Classes:** PascalCase (e.g., `PollManager`)
- **Functions/Variables:** camelCase (e.g., `createPoll`, `roomCode`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `JOIN_ROOM`, `SUBMIT_VOTE`)
- **Private Methods:** Underscore prefix (e.g., `_generateUniqueRoomCode()`)

### Logging
- Use `logger.info()`, `logger.warn()`, `logger.error()` (Pino)
- Include contextual data: `logger.info({ socketId, roomCode }, 'Message')`
- Never use `console.log()` in production code

### Error Handling
- Use centralized error handler middleware
- Return descriptive error messages in responses
- Log all errors with context

### Testing
- **TDD Required:** Write tests before implementation (Constitution Principle IV)
- **Coverage Target:** ≥90% for core logic (currently: 95.53%)
- **Test Structure:** Arrange-Act-Assert pattern
- **Test Types:**
  - Unit: Test individual functions/methods
  - Contract: Test API/WebSocket interfaces
  - Integration: Test complete user flows
  - Performance: Test scalability and latency

## Architecture Notes

### Data Storage
- In-memory Map-based storage (MVP)
- PollManager singleton instance
- No database required for MVP

### Real-time Communication
- Socket.io rooms for poll isolation
- Broadcast pattern for vote updates
- Host joins Socket.io room with simple 'join' event
- Participants join with 'join-room' event (tracked in poll.participants)

### Room Code Format
- 6 characters
- Alphabet: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (excludes 0, 1, O, I)
- Example: 3B7KWX

### Event Types
**Client → Server:**
- `join-room` - Participant joins poll
- `submit-vote` - Participant submits/changes vote
- `change-poll-state` - Host opens/closes voting

**Server → Client:**
- `participant-joined` - New participant joined {nickname, count}
- `participant-left` - Participant disconnected {nickname, count}
- `vote-update` - Vote counts updated {votes, percentages}
- `poll-state-changed` - Poll state changed {newState, previousState}

## Recent Changes
- 002-production-ready: Added Node.js 18+ (LTS) / JavaScript ES6+

- 001-voting-app-mvp: Implemented backend MVP with Express, Socket.io, real-time voting
- Added performance testing for 20 concurrent participants (max latency: 13ms)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
