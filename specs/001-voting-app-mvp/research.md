# Research: Voting App MVP

**Date**: 2025-11-07
**Feature**: 001-voting-app-mvp
**Purpose**: Resolve technical unknowns from Technical Context and establish best practices for real-time WebSocket application

## Research Topics

### 1. TypeScript Adoption for MVP

**Decision**: Use JavaScript (not TypeScript) for MVP

**Rationale**:
- 2-5 day MVP timeline demands speed over type safety infrastructure setup
- Constitution Principle II (Simplicity & MVP Focus) prioritizes rapid iteration
- TypeScript adds tsconfig complexity, build step overhead, and learning curve if team unfamiliar
- JavaScript with JSDoc comments provides lightweight type hints without build pipeline
- Can migrate to TypeScript post-MVP if project scales beyond initial scope

**Alternatives Considered**:
- **TypeScript strict mode**: Rejected due to setup time (tsconfig, build config, IDE setup) consuming 10-15% of MVP timeline
- **TypeScript with permissive mode**: Rejected as it provides minimal value without strict checking while still adding build complexity

**Implementation**:
- Use modern JavaScript (ES2020+) with async/await
- Add JSDoc type annotations for critical functions (Socket.io event handlers, PollManager methods)
- Configure ESLint with type-aware rules (no-implicit-any via JSDoc)
- Document migration path to TypeScript in future enhancements

---

### 2. Linting and Formatting Configuration

**Decision**: ESLint + Prettier with Airbnb style guide (modified)

**Rationale**:
- ESLint industry standard for JavaScript quality checking
- Prettier eliminates formatting bikeshedding with opinionated auto-formatting
- Airbnb style guide widely adopted, enforces best practices for async/await, imports, and error handling
- Both integrate with VS Code, WebStorm, and most IDEs for real-time feedback

**Alternatives Considered**:
- **Standard.js**: Rejected due to no semicolons style (team preference ambiguous, Airbnb more common)
- **XO**: Rejected as less common, smaller plugin ecosystem than ESLint

**Configuration**:

**ESLint** (`.eslintrc.js`):
```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'prettier' // Disables ESLint formatting rules that conflict with Prettier
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow error logging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Ignore unused params prefixed with _
    'import/extensions': ['error', 'ignorePackages'], // Require .js extensions in imports
    'max-len': ['warn', { code: 100, ignoreUrls: true }] // Soft limit, matches Prettier
  }
};
```

**Prettier** (`.prettierrc`):
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "avoid"
}
```

---

### 3. Pre-commit Hook Strategy

**Decision**: Husky + lint-staged for pre-commit quality gates

**Rationale**:
- Husky integrates Git hooks with npm scripts, team-friendly setup via package.json
- lint-staged runs linting/formatting only on staged files (fast, <2s for typical commit)
- Enforces Constitution Principle V (Code Quality Standards) automatically
- Fails fast on local machine before CI, saves round-trip time

**Alternatives Considered**:
- **Manual pre-commit scripts**: Rejected due to fragility (Git hooks not version-controlled by default)
- **CI-only checks**: Rejected as violates constitution requirement for pre-commit enforcement
- **pre-commit (Python tool)**: Rejected to avoid Python dependency for Node.js project

**Configuration**:

**package.json**:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

**Setup Commands**:
```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

---

### 4. Socket.io Best Practices for Real-time Polling

**Decision**: Namespace isolation, event acknowledgments, and graceful reconnection

**Rationale**:
- Socket.io namespaces provide room isolation per constitution Principle III (Component Isolation)
- Event acknowledgments enable instant vote confirmation per FR-012
- Automatic reconnection handles network disruptions per FR-018 and SC-007

**Key Patterns**:

**Server-side (backend/src/sockets/socketHandler.js)**:
```javascript
const io = require('socket.io')(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' }
});

io.on('connection', socket => {
  // Join room with acknowledgment
  socket.on('join-room', ({ roomCode, nickname }, ack) => {
    const poll = pollManager.getPoll(roomCode);
    if (!poll) {
      return ack({ success: false, error: 'Poll not found' });
    }
    if (poll.participants.has(nickname)) {
      return ack({ success: false, error: 'Nickname already taken' });
    }

    socket.join(roomCode);
    poll.participants.add(nickname);
    socket.to(roomCode).emit('participant-joined', { nickname, count: poll.participants.size });
    ack({ success: true, poll });
  });

  // Submit vote with acknowledgment
  socket.on('submit-vote', ({ roomCode, nickname, optionIndex }, ack) => {
    const result = pollManager.recordVote(roomCode, nickname, optionIndex);
    if (!result.success) {
      return ack({ success: false, error: result.error });
    }

    io.to(roomCode).emit('vote-update', { votes: result.votes });
    ack({ success: true });
  });
});
```

**Client-side (frontend/src/services/socketService.js)**:
```javascript
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

export const joinRoom = (roomCode, nickname) => {
  return new Promise((resolve, reject) => {
    socket.emit('join-room', { roomCode, nickname }, response => {
      if (response.success) {
        resolve(response.poll);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};
```

**Reconnection Handling**:
- Store room code and nickname in sessionStorage
- On `reconnect` event, auto-rejoin room with stored credentials
- Display "Reconnecting..." UI during `disconnect` event
- Fetch latest poll state on successful reconnection

---

### 5. Testing Strategy for WebSocket Applications

**Decision**: Jest + Socket.io-client + Supertest for multi-layer testing

**Rationale**:
- Jest familiar to Node.js developers, built-in mocking for unit tests
- Socket.io-client enables real client connections for integration tests
- Supertest validates HTTP endpoints (poll creation) alongside WebSocket events
- Supports TDD workflow per constitution Principle IV

**Test Layers**:

**Unit Tests** (backend/tests/unit/PollManager.test.js):
```javascript
const PollManager = require('../../src/models/PollManager');

describe('PollManager', () => {
  let manager;

  beforeEach(() => {
    manager = new PollManager();
  });

  test('creates poll with unique room code', () => {
    const poll = manager.createPoll('What is your favorite color?', ['Red', 'Blue', 'Green']);
    expect(poll.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(manager.getPoll(poll.roomCode)).toBe(poll);
  });

  test('records vote and updates counts', () => {
    const poll = manager.createPoll('Test?', ['A', 'B']);
    const result = manager.recordVote(poll.roomCode, 'Alice', 0);
    expect(result.success).toBe(true);
    expect(result.votes[0]).toBe(1);
  });
});
```

**Integration Tests** (backend/tests/integration/realTimeSync.test.js):
```javascript
const io = require('socket.io-client');
const { startServer, stopServer } = require('../../src/server');

describe('Real-time vote synchronization', () => {
  let server, hostSocket, participant1, participant2;

  beforeAll(async () => {
    server = await startServer(4001); // Test port
  });

  afterAll(async () => {
    await stopServer(server);
  });

  beforeEach(done => {
    hostSocket = io('http://localhost:4001');
    participant1 = io('http://localhost:4001');
    participant2 = io('http://localhost:4001');

    let connected = 0;
    [hostSocket, participant1, participant2].forEach(socket => {
      socket.on('connect', () => {
        if (++connected === 3) done();
      });
    });
  });

  afterEach(() => {
    [hostSocket, participant1, participant2].forEach(socket => socket.disconnect());
  });

  test('broadcasts votes to all participants in room', done => {
    const roomCode = 'TEST01';
    let updateCount = 0;

    // Host and participant1 listen for updates
    [hostSocket, participant1].forEach(socket => {
      socket.on('vote-update', data => {
        expect(data.votes).toEqual([1, 0]);
        if (++updateCount === 2) done();
      });
    });

    // Both join room, then participant1 votes
    Promise.all([
      new Promise(resolve => hostSocket.emit('join-room', { roomCode, nickname: 'Host' }, resolve)),
      new Promise(resolve => participant1.emit('join-room', { roomCode, nickname: 'Alice' }, resolve))
    ]).then(() => {
      participant1.emit('submit-vote', { roomCode, nickname: 'Alice', optionIndex: 0 });
    });
  });
});
```

**Contract Tests** (backend/tests/contract/websocket.test.js):
- Validate all Socket.io event names match shared/eventTypes.js constants
- Verify event payload schemas (roomCode format, nickname length, optionIndex range)
- Test error responses for invalid inputs (missing fields, wrong types)

---

### 6. Room Code Generation Strategy

**Decision**: nanoid with custom alphabet (uppercase alphanumeric, 6 characters)

**Rationale**:
- nanoid faster and smaller than UUID (141 bytes vs 680 bytes for uuid package)
- 6-character codes with 36-char alphabet = 36^6 = 2.1 billion combinations (collision-resistant for MVP scale)
- Uppercase alphanumeric avoids ambiguous characters (0/O, 1/I) by using custom alphabet
- Human-readable for verbal communication in presentations

**Alternatives Considered**:
- **UUID**: Rejected as too long (36 chars) for manual entry
- **shortid**: Deprecated, security vulnerabilities
- **Random 4-digit numbers**: Rejected due to high collision rate (10,000 combinations insufficient)

**Implementation** (backend/src/services/roomCodeGenerator.js):
```javascript
const { customAlphabet } = require('nanoid');

// Custom alphabet excluding ambiguous characters: 0, O, I, 1
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(alphabet, 6);

module.exports = { generateRoomCode };
```

---

### 7. Frontend Framework Decision

**Decision**: React 18 (no framework alternatives considered per scope)

**Rationale**:
- React most common for real-time web apps, large Socket.io-client integration ecosystem
- Hooks (useState, useEffect) simplify Socket.io connection management
- Component model aligns with constitution Principle III (Component Isolation)
- Fast development with Create React App (no webpack config needed)

**Alternatives Considered**:
- **Vue.js**: Rejected to minimize decision overhead (React pre-determined by team/project context)
- **Vanilla JS**: Rejected due to manual DOM manipulation complexity for real-time updates

**Key Libraries**:
- socket.io-client: WebSocket client
- react-router-dom: Client-side routing (host dashboard, join page, vote page)
- chart.js or recharts: Vote results visualization (bar chart/percentages)

---

### 8. Error Handling and Logging Strategy

**Decision**: Centralized error middleware + structured logging (pino)

**Rationale**:
- Express error middleware provides single point for error formatting and logging
- Pino is 5x faster than winston with lower overhead (critical for real-time apps)
- Structured JSON logs enable log aggregation (future Grafana/Splunk integration)
- Constitution Principle V requires security vulnerability visibility (log all errors)
- Pino's child logger feature simplifies request tracing

**Alternatives Considered**:
- **winston**: Rejected due to higher overhead and slower performance compared to pino
- **bunyan**: Rejected as pino is more actively maintained with better ecosystem support

**Implementation** (backend/src/api/middleware/errorHandler.js):
```javascript
const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  req.log.error({
    err,
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Request error');

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};
```

**Logger Configuration** (backend/src/config/logger.js):
```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

module.exports = logger;
```

**Express Integration** (backend/src/server.js):
```javascript
const express = require('express');
const pino = require('pino-http');
const logger = require('./config/logger');

const app = express();

// Attach pino logger to each request
app.use(pino({ logger }));

// Now req.log is available in all routes and middleware
```

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---------|-----------|
| TypeScript adoption | **JavaScript** with JSDoc for MVP speed |
| Linting tool | **ESLint** (Airbnb style guide) + Prettier |
| Pre-commit hooks | **Husky** + lint-staged with ESLint/Prettier/Jest |
| Socket.io patterns | Acknowledgments, namespace isolation, auto-reconnect |
| Testing framework | **Jest** + Socket.io-client + Supertest |
| Room code generation | **nanoid** (6 chars, custom alphabet) |
| Frontend framework | **React 18** with socket.io-client |
| Error handling | Centralized middleware + **pino** logging |

All resolutions align with Constitution Principles II (Simplicity), IV (TDD), and V (Code Quality Standards). Proceed to Phase 1 (data-model.md, contracts generation).
