# Zephyr Voting App

> Real-time polling application for small groups with WebSocket-based live updates

[![Test Coverage](https://img.shields.io/badge/coverage-95.53%25-brightgreen)](backend/tests)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Zephyr is a lightweight, real-time voting application designed for presentations, meetings, and events with 5-20 participants. Features instant vote updates, live results visualization, and seamless WebSocket connectivity.

## ✨ Features

### For Hosts
- 📊 **Create Polls**: Question with 2-5 answer options
- 🔑 **Unique Room Codes**: 6-character codes for easy sharing
- 🎛️ **Poll Controls**: Open and close voting on demand
- 📈 **Live Results**: Real-time vote counts with bar charts
- 👥 **Participant Tracking**: See connected participant count
- 🔄 **State Management**: Control poll lifecycle (waiting → open → closed)

### For Participants
- 🚪 **Easy Join**: Enter room code and nickname to join
- ✅ **Vote**: Select option and submit instantly
- 🔄 **Change Vote**: Update vote while voting is open
- ⚡ **Real-Time Updates**: See live vote counts and percentages
- 🔌 **Auto-Reconnect**: Seamless recovery from connection loss

### Technical Features
- 🌐 **WebSocket Communication**: Socket.io for <2s latency
- 💾 **In-Memory Storage**: No database required (MVP)
- 🧪 **95%+ Test Coverage**: Comprehensive test suite

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Host      │  │   Join      │  │    Vote     │         │
│  │  Dashboard  │  │    Page     │  │    Page     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │   HTTP + WebSocket    │
                └───────────┬───────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                  Backend (Node.js + Express)                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    REST API                              │ │
│  │  POST /api/polls    GET /api/polls/:roomCode            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Socket.io (WebSocket)                   │ │
│  │  join-room  submit-vote  change-poll-state              │ │
│  │  participant-joined  vote-update  poll-state-changed    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              In-Memory Storage (Map)                     │ │
│  │  Poll Manager: Polls, Votes, Participants               │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zephyr.git
cd zephyr

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Start backend
cd backend
npm start
# Server runs on http://localhost:4000

# Terminal 2: Start frontend
cd frontend
npm start
# App runs on http://localhost:3000
```

### First Poll

1. Open http://localhost:3000 in your browser
2. Create a poll with a question and 2-5 options
3. Share the displayed room code with participants
4. Click "Open Voting" to start
5. Participants go to http://localhost:3000/join
6. Enter room code and nickname
7. Submit votes and watch live results!

## 📚 Documentation

- **[Backend Documentation](backend/README.md)** - API reference, WebSocket events, data models
- **[Frontend Documentation](frontend/README.md)** - Components, services, routing, styling
- **[Feature Specification](specs/001-voting-app-mvp/spec.md)** - Requirements and acceptance criteria
- **[Development Guide](CLAUDE.md)** - Tech stack, commands, architecture notes

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests with coverage
npm test

# Current coverage: 95.53%
# ✅ Unit tests (models, services)
# ✅ Contract tests (API, WebSocket)
# ✅ Integration tests (user flows)
# ✅ Performance tests (20 concurrent participants)
```


## 🏛️ Project Structure

```
zephyr/
├── backend/                    # Node.js + Express backend
│   ├── src/
│   │   ├── api/               # REST API routes & middleware
│   │   ├── config/            # Configuration & logging
│   │   ├── models/            # Data models (PollManager)
│   │   ├── services/          # Business logic
│   │   ├── sockets/           # Socket.io event handlers
│   │   └── server.js          # Entry point
│   ├── tests/                 # Test suites (unit, contract, integration, performance)
│   └── README.md              # Backend documentation
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── pages/             # Page components (Host, Join, Vote)
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API & Socket.io clients
│   │   ├── utils/             # Utility functions
│   │   └── App.jsx            # Main app & routing
│   ├── tests/                 # Frontend tests
│   └── README.md              # Frontend documentation
├── specs/                      # Feature specifications
│   └── 001-voting-app-mvp/    # MVP spec, plan, tasks
├── shared/                     # Shared constants (event types)
├── package.json                # Root dependencies
├── CLAUDE.md                   # Development guide
└── README.md                   # This file
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5.1.0
- **WebSocket**: Socket.io 4.8.1
- **Logging**: Pino
- **Testing**: Jest 30.x
- **Code Quality**: ESLint (Airbnb), Prettier, Husky

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router DOM 7.9.5
- **WebSocket**: Socket.io Client 4.8.1
- **Charts**: Chart.js 4.5.1
- **Styling**: CSS (vanilla)

### Testing
- **Backend Testing**: Jest 30.x
- **Coverage**: 95.53% (backend)

## 📊 Performance

- **Max Participants**: 20 per poll
- **Vote Latency**: <2s (requirement), 13ms (actual max)
- **Test Coverage**: 95.53% (backend)
- **Storage**: In-memory (no database required)

## 🔐 Security Considerations

### Current MVP Limitations

⚠️ **This is an MVP for demonstration and small group use. Not production-ready for sensitive data.**

- No authentication (nickname-only)
- No data persistence (in-memory storage)
- No encryption (HTTP/WebSocket)
- No rate limiting
- No input sanitization (XSS vulnerable)

### Production Recommendations

Before deploying to production:

1. ✅ Add authentication (JWT, OAuth)
2. ✅ Implement HTTPS/WSS
3. ✅ Add persistent storage (Redis, PostgreSQL)
4. ✅ Implement rate limiting
5. ✅ Add input sanitization (DOMPurify)
6. ✅ Enable CORS restrictions
7. ✅ Add authorization (host vs participant roles)
8. ✅ Implement session management
9. ✅ Add audit logging
10. ✅ Security headers (helmet.js)

## 🚦 API Reference

### REST API

```http
# Create poll
POST /api/polls
Content-Type: application/json

{
  "question": "What is your favorite language?",
  "options": ["JavaScript", "Python", "Go", "Rust"]
}

# Get poll
GET /api/polls/:roomCode

# Health check
GET /api/health
```

### WebSocket Events

**Client → Server:**
- `join-room` - Participant joins
- `submit-vote` - Submit/change vote
- `change-poll-state` - Host opens/closes voting

**Server → Client:**
- `participant-joined` - New participant
- `participant-left` - Participant disconnected
- `vote-update` - Vote counts updated
- `poll-state-changed` - Poll state changed

See [Backend README](backend/README.md) for detailed API documentation.

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**: Fork the repository and clone locally
2. **Create Branch**: `git checkout -b feature/amazing-feature`
3. **Install Dependencies**: Run `npm install` in root, backend, and frontend
4. **Make Changes**: Follow code style guidelines (ESLint, Prettier)
5. **Write Tests**: TDD approach - tests before implementation
6. **Run Tests**: `npm test` (backend)
7. **Commit**: Pre-commit hooks enforce quality checks
8. **Push**: `git push origin feature/amazing-feature`
9. **Pull Request**: Open PR with description and screenshots

### Code Style

- **JavaScript**: Airbnb Style Guide
- **React**: Functional components, hooks
- **Testing**: Jest (unit, integration, contract)
- **Commits**: Conventional Commits format
- **Coverage**: Maintain >90% test coverage

### Running Quality Checks

```bash
# Backend
cd backend
npm run lint      # ESLint
npm run format    # Prettier
npm test          # Tests + coverage
```

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built following TDD principles
- Test coverage: 95.53% (backend)
- E2E test coverage: 29 tests across 3 browsers
- Specification-driven development

## 🔗 Links

- **Documentation**: [Backend](backend/README.md) | [Frontend](frontend/README.md) | [E2E](e2e/README.md)
- **Specifications**: [Feature Spec](specs/001-voting-app-mvp/spec.md) | [Implementation Plan](specs/001-voting-app-mvp/plan.md)
- **CI/CD**: [GitHub Actions](.github/workflows/e2e-tests.yml)

## 📮 Support

For issues, questions, or contributions:
- **Issues**: [GitHub Issues](https://github.com/yourusername/zephyr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/zephyr/discussions)

---

**Built with ❤️ using React, Node.js, and Socket.io**
