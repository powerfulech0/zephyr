# zephyr Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-07

## Active Technologies

### Backend (001-voting-app-mvp)

**Runtime & Language:**
- Node.js 18+ (LTS)
- JavaScript (ES6+)

**Core Dependencies:**
- Express 4.x - Web server and REST API
- Socket.io 4.x - WebSocket real-time communication
- nanoid - Secure room code generation
- pino - Structured logging
- pino-http - HTTP request logging middleware
- cors - Cross-Origin Resource Sharing
- dotenv - Environment variable management

**Development Dependencies:**
- Jest 30.x - Testing framework
- ESLint - Linting with Airbnb style guide
- Prettier - Code formatting
- Husky - Git hooks
- lint-staged - Pre-commit validation
- socket.io-client - WebSocket testing
- supertest - HTTP API testing
- nodemon - Development auto-reload

## Project Structure

```text
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   └── validator.js         # Request validation
│   │   └── routes/
│   │       ├── healthRoutes.js      # Health check endpoint
│   │       └── pollRoutes.js        # Poll CRUD endpoints
│   ├── config/
│   │   ├── index.js                 # Environment configuration
│   │   └── logger.js                # Pino logger setup
│   ├── models/
│   │   └── PollManager.js           # In-memory poll data model
│   ├── services/
│   │   └── roomCodeGenerator.js    # Unique room code generation
│   ├── sockets/
│   │   ├── events/
│   │   │   ├── changePollState.js  # Host state control
│   │   │   ├── joinRoom.js         # Participant join
│   │   │   └── submitVote.js       # Vote submission
│   │   ├── emitters/
│   │   │   ├── broadcastStateChange.js # Broadcast poll state
│   │   │   └── broadcastVoteUpdate.js  # Broadcast vote counts
│   │   └── socketHandler.js        # Socket.io connection handler
│   └── server.js                    # Application entry point
├── tests/
│   ├── unit/                        # Unit tests (models, services)
│   ├── contract/                    # API/WebSocket contract tests
│   ├── integration/                 # Integration tests (full flows)
│   └── performance/                 # Performance tests (20+ participants)
├── .env                             # Environment variables
├── .eslintrc.js                     # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── jest.config.js                   # Jest configuration
└── package.json                     # Dependencies and scripts

shared/
└── eventTypes.js                    # WebSocket event constants

frontend/
└── (not implemented yet)

specs/
└── 001-voting-app-mvp/              # Feature specification
    ├── spec.md                      # Requirements
    ├── plan.md                      # Implementation plan
    ├── data-model.md                # Data structures
    ├── tasks.md                     # Task breakdown
    └── contracts/                   # API contracts
```

## Commands

### Development
```bash
cd backend
npm start              # Start server with nodemon
npm run dev            # Alias for npm start
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
```

### Performance
```bash
npm test -- tests/performance/concurrentParticipants.test.js
# Tests 20 concurrent participants (<2s broadcast latency)
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

- 001-voting-app-mvp: Implemented backend MVP with Express, Socket.io, real-time voting
- Added performance testing for 20 concurrent participants (max latency: 13ms)
- Achieved 95.53% test coverage (exceeds 90% requirement)
- Configured pre-commit hooks with lint-staged

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
