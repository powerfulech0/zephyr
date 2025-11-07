# Zephyr Voting App - Backend

Real-time voting backend built with Node.js, Express, and Socket.io for small group polling (5-20 participants).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- tests/unit/PollManager.test.js

# Lint code
npm run lint

# Format code
npm run format
```

## 📋 Prerequisites

- Node.js 18+ (LTS)
- npm 9+

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.1.0
- **WebSocket**: Socket.io 4.8.1
- **Storage**: In-memory (Map-based)
- **Logging**: Pino
- **Testing**: Jest 30.x
- **Code Quality**: ESLint (Airbnb), Prettier, Husky

### Project Structure

```
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
```

## 🔌 API Reference

### REST Endpoints

#### Health Check
```http
GET /api/health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T21:00:00.000Z"
}
```

#### Create Poll
```http
POST /api/polls
Content-Type: application/json

{
  "question": "What is your favorite programming language?",
  "options": ["JavaScript", "Python", "Go", "Rust"]
}
```

**Response:**
```json
{
  "success": true,
  "poll": {
    "roomCode": "3B7KWX",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "state": "waiting",
    "createdAt": "2025-11-07T21:00:00.000Z"
  }
}
```

**Validation Rules:**
- `question`: Required, 1-500 characters
- `options`: Required array, 2-5 items, each 1-100 characters
- Unique room codes generated automatically

#### Get Poll
```http
GET /api/polls/:roomCode
```

**Response:**
```json
{
  "success": true,
  "poll": {
    "roomCode": "3B7KWX",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "state": "open",
    "votes": [5, 3, 2, 1],
    "percentages": [45.45, 27.27, 18.18, 9.09],
    "participantCount": 11
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Poll not found"
}
```

### WebSocket Events

#### Client → Server

**Join Room (Participant)**
```javascript
socket.emit('join-room', { roomCode, nickname }, (response) => {
  // response: { success: true, poll: {...} }
});
```

**Submit Vote**
```javascript
socket.emit('submit-vote', { roomCode, nickname, optionIndex }, (response) => {
  // response: { success: true } or { success: false, error: '...' }
});
```

**Change Poll State (Host)**
```javascript
socket.emit('change-poll-state', { roomCode, newState }, (response) => {
  // newState: 'open' | 'closed'
  // response: { success: true, state: 'open' }
});
```

**Join Room (Host - Simple)**
```javascript
socket.emit('join', roomCode);
// No acknowledgment, used for host to join Socket.io room
```

#### Server → Client

**Participant Joined**
```javascript
socket.on('participant-joined', (data) => {
  // data: { nickname: 'Alice', count: 5, timestamp: '...' }
});
```

**Participant Left**
```javascript
socket.on('participant-left', (data) => {
  // data: { nickname: 'Bob', count: 4, timestamp: '...' }
});
```

**Vote Update**
```javascript
socket.on('vote-update', (data) => {
  // data: { votes: [5, 3, 2, 1], percentages: [45.45, 27.27, 18.18, 9.09] }
});
```

**Poll State Changed**
```javascript
socket.on('poll-state-changed', (data) => {
  // data: { newState: 'open', previousState: 'waiting', timestamp: '...' }
});
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3000
```

**Variables:**
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development, test, production)
- `LOG_LEVEL`: Logging level (trace, debug, info, warn, error, fatal)
- `FRONTEND_URL`: Frontend URL for CORS

## 🧪 Testing

### Test Coverage

Current coverage: **95.53%**

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- tests/unit/PollManager.test.js
npm test -- tests/contract/pollApi.test.js
npm test -- tests/integration/hostFlow.test.js

# Run tests in watch mode
npm run test:watch
```

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - PollManager methods (create, vote, state changes)
   - Room code generator
   - Service logic

2. **Contract Tests** (`tests/contract/`)
   - REST API endpoints
   - WebSocket event schemas
   - Request/response validation

3. **Integration Tests** (`tests/integration/`)
   - Complete host flow (create → open → close)
   - Participant flow (join → vote → change vote)
   - Real-time synchronization

4. **Performance Tests** (`tests/performance/`)
   - 20 concurrent participants
   - Vote broadcast latency (<2s requirement)
   - Current max latency: 13ms

## 📊 Data Model

### Poll Object

```javascript
{
  roomCode: String,        // 6-character unique code
  question: String,        // Poll question (1-500 chars)
  options: Array<String>,  // 2-5 options (each 1-100 chars)
  state: String,           // 'waiting' | 'open' | 'closed'
  votes: Map,              // nickname → optionIndex
  participants: Map,       // socketId → nickname
  createdAt: Date          // Creation timestamp
}
```

### Room Code Format

- **Length**: 6 characters
- **Alphabet**: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
- **Excludes**: 0, 1, O, I (to avoid confusion)
- **Example**: 3B7KWX

## 🔐 Security Considerations

### MVP Limitations

- **No authentication**: Nickname-only identification
- **No authorization**: Any client can be a host
- **No persistence**: Data lost on server restart
- **No encryption**: WebSocket traffic not encrypted (use HTTPS/WSS in production)
- **No rate limiting**: Vulnerable to spam/DoS (add in production)

### Production Recommendations

1. Add authentication (JWT, OAuth)
2. Implement rate limiting
3. Add input sanitization
4. Use HTTPS/WSS
5. Add persistent storage
6. Implement authorization (host vs participant roles)
7. Add request validation middleware

## 🚦 Error Handling

All errors are handled by centralized middleware:

```javascript
// Example error response
{
  "success": false,
  "error": "Poll not found",
  "timestamp": "2025-11-07T21:00:00.000Z"
}
```

**Common Error Codes:**
- `400 Bad Request`: Invalid input (validation errors)
- `404 Not Found`: Poll/resource not found
- `500 Internal Server Error`: Server-side errors

## 📈 Performance

### Benchmarks

- **Max participants**: 20 per poll
- **Vote broadcast latency**: <2s (requirement), 13ms (actual max)
- **Memory usage**: In-memory Map-based storage
- **Concurrent polls**: No hard limit (memory-dependent)

### Scalability Notes

- Current implementation: Single-server, in-memory
- For production scale:
  - Add Redis for session/state storage
  - Use Socket.io Redis adapter for multi-server
  - Add database for persistence
  - Implement horizontal scaling

## 🐛 Debugging

### Logging

All logs use Pino structured logging:

```javascript
logger.info({ roomCode, state }, 'Poll state changed');
logger.error({ error, socketId }, 'Failed to process vote');
```

### Development Tips

```bash
# Start with debug logging
LOG_LEVEL=debug npm start

# Watch tests during development
npm run test:watch

# Check specific socket events
# Add console.log in src/sockets/socketHandler.js
```

## 🤝 Contributing

1. Follow Airbnb JavaScript Style Guide
2. Write tests before implementation (TDD)
3. Ensure tests pass: `npm test`
4. Lint code: `npm run lint`
5. Format code: `npm run format`
6. Pre-commit hooks enforce quality checks

## 📝 License

See root repository LICENSE file.

## 🔗 Related Documentation

- [Frontend README](../frontend/README.md)
- [Project README](../README.md)
- [Feature Specification](../specs/001-voting-app-mvp/spec.md)
