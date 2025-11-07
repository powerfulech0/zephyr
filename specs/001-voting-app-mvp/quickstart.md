# Quickstart: Voting App MVP

**Feature**: 001-voting-app-mvp
**Date**: 2025-11-07
**Purpose**: Get the voting app running locally in under 10 minutes

## Prerequisites

- **Node.js**: v18 LTS or higher (`node --version`)
- **npm**: v9 or higher (`npm --version`)
- **Git**: For version control
- **Code editor**: VS Code recommended (ESLint/Prettier extensions)

---

## Initial Setup (First Time Only)

### 1. Initialize Project Structure

```bash
# From repository root
mkdir -p backend/src/{models,services,api/routes,api/middleware,sockets/events,sockets/emitters,config}
mkdir -p backend/tests/{unit,integration,contract}
mkdir -p frontend/src/{pages,components,services,utils}
mkdir -p frontend/public
mkdir -p shared

# Create placeholder files to preserve structure
touch backend/src/server.js
touch frontend/src/index.js
```

### 2. Initialize Backend

```bash
cd backend
npm init -y

# Install dependencies
npm install express socket.io nanoid pino pino-http cors

# Install dev dependencies
npm install --save-dev \
  jest \
  supertest \
  socket.io-client \
  eslint \
  eslint-config-airbnb-base \
  eslint-plugin-import \
  eslint-plugin-jest \
  eslint-config-prettier \
  prettier \
  husky \
  lint-staged \
  nodemon

# Initialize ESLint
npx eslint --init
# Choose: "To check syntax and find problems" → "CommonJS" → "None" → "Node" → "JavaScript"

# Copy ESLint config from research.md
cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/extensions': ['error', 'ignorePackages'],
    'max-len': ['warn', { code: 100, ignoreUrls: true }]
  }
};
EOF

# Create Prettier config
cat > .prettierrc << 'EOF'
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "avoid"
}
EOF

# Setup Husky + lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# Add lint-staged config to package.json
npm pkg set 'lint-staged.*.js[0]'='eslint --fix'
npm pkg set 'lint-staged.*.js[1]'='prettier --write'
npm pkg set 'lint-staged.*.js[2]'='jest --bail --findRelatedTests'

# Add scripts to package.json
npm pkg set scripts.start="nodemon src/server.js"
npm pkg set scripts.test="jest --coverage"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.lint="eslint src/ tests/"
npm pkg set scripts.format="prettier --write 'src/**/*.js' 'tests/**/*.js'"
```

### 3. Initialize Frontend

```bash
cd ../frontend

# Use Create React App
npx create-react-app . --template minimal
# Or manually:
npm init -y
npm install react react-dom react-router-dom socket.io-client chart.js

# Install dev dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  eslint-config-airbnb \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  prettier

# Copy ESLint/Prettier configs (similar to backend, add React plugins)
```

### 4. Create Environment Files

**Backend** (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:4000
```

---

## Running the Application

### Terminal 1: Start Backend

```bash
cd backend
npm start

# Expected output:
# > nodemon src/server.js
# [nodemon] starting `node src/server.js`
# Server listening on port 4000
# Socket.io ready
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm start

# Expected output:
# Compiled successfully!
# Local:            http://localhost:3000
# On Your Network:  http://192.168.1.x:3000
```

### Terminal 3: Run Tests (Optional)

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## Manual Testing Workflow

### Test User Story 1: Host Creates Poll (P1)

1. **Open browser**: http://localhost:3000
2. **Navigate to Host Dashboard**: Click "Create Poll" or go to `/host`
3. **Create poll**:
   - Question: "What is your favorite color?"
   - Options: ["Red", "Blue", "Green", "Yellow"]
   - Click "Create Poll"
4. **Verify**:
   - ✅ Room code displayed (e.g., "AB3K9T")
   - ✅ Poll state shows "Waiting"
   - ✅ Participant count shows "0"
5. **Open voting**: Click "Open Voting" button
6. **Verify**:
   - ✅ Poll state changes to "Open"
   - ✅ Button changes to "Close Voting"

### Test User Story 2: Participant Joins and Votes (P2)

7. **Open new incognito window**: http://localhost:3000
8. **Navigate to Join Page**: Click "Join Poll" or go to `/join`
9. **Enter credentials**:
   - Room code: [paste room code from step 4]
   - Nickname: "Alice"
   - Click "Join"
10. **Verify**:
    - ✅ Redirected to vote page
    - ✅ Question and options displayed
    - ✅ All options are clickable buttons/radio
11. **Submit vote**: Select "Blue" → Click "Vote"
12. **Verify**:
    - ✅ Confirmation message appears ("Vote recorded!")
    - ✅ Vote button changes to "Change Vote"

### Test User Story 3: Live Results (P3)

13. **Switch back to host window** (first tab)
14. **Verify live update**:
    - ✅ Participant count shows "1"
    - ✅ Vote counts show Blue: 1, others: 0
    - ✅ Percentages show Blue: 100%, others: 0%
15. **Open another participant window**:
    - Join with nickname "Bob"
    - Vote for "Red"
16. **Verify in all 3 windows**:
    - ✅ Host sees participant count "2"
    - ✅ Alice sees vote update (Red: 1, Blue: 1)
    - ✅ Bob sees vote update immediately after submitting

### Test Edge Cases

17. **Duplicate nickname**:
    - Try joining with "Alice" again → ✅ Error: "Nickname already taken"
18. **Invalid room code**:
    - Try joining "INVALID" → ✅ Error: "Poll not found"
19. **Vote when closed**:
    - Host closes voting → Alice tries to change vote → ✅ Error: "Voting is not open"
20. **Reconnection**:
    - Disconnect Alice (close tab) → Reconnect with same nickname → ✅ Rejoins successfully

---

## Automated Testing

### Run All Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm test -- tests/unit

# Integration tests only
npm test -- tests/integration

# Contract tests only
npm test -- tests/contract

# Watch mode (TDD)
npm run test:watch
```

### Test Coverage

```bash
cd backend
npm test -- --coverage

# Expected output:
# File                | % Stmts | % Branch | % Funcs | % Lines |
# --------------------|---------|----------|---------|---------|
# All files           |   95.12 |    90.23 |   94.50 |   95.45 |
#  models/            |   98.00 |    95.00 |   97.50 |   98.20 |
#  services/          |   92.30 |    85.40 |   91.00 |   92.50 |
#  sockets/           |   94.50 |    89.00 |   93.80 |   94.70 |
```

**Constitution Requirement**: Tests must pass before commits (Principle IV)

---

## Debugging Tips

### Backend Logs (Pino)

```bash
# View formatted logs
cd backend
npm start | npx pino-pretty

# Example output:
# [10:30:45.123] INFO: Server listening on port 4000
# [10:31:02.456] INFO: Socket connected (socketId: xyz123)
# [10:31:05.789] INFO: Poll created (roomCode: AB3K9T)
```

### Frontend DevTools

1. **Open Chrome DevTools**: F12 or Cmd+Option+I
2. **Network tab**: Filter by "WS" to see WebSocket frames
3. **Console**: Check for Socket.io connection logs

### Common Issues

| Problem | Solution |
|---------|----------|
| Backend won't start | Check PORT 4000 not in use: `lsof -i :4000` |
| Socket.io connection fails | Verify CORS settings in backend/src/server.js |
| Tests fail with "port already in use" | Stop `npm start` before running tests |
| ESLint errors on commit | Run `npm run lint --fix` to auto-fix |
| Vote updates not broadcasting | Check socket.to(roomCode).emit() syntax |

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 3 user stories (P1, P2, P3) manually tested successfully
- [ ] All 7 edge cases tested (duplicate nickname, invalid code, closed voting, etc.)
- [ ] All automated tests pass (unit, integration, contract)
- [ ] Test coverage ≥90% for backend core logic
- [ ] ESLint + Prettier pass with zero errors
- [ ] Pre-commit hooks configured and working
- [ ] Performance: Vote updates <2s, state changes <1s
- [ ] 20 concurrent participants supported (load test with k6 or artillery)
- [ ] Constitution Check re-evaluated and passing

---

## Next Steps

After quickstart validation:

1. **Run `/speckit.tasks`**: Generate tasks.md for implementation
2. **TDD workflow**: Write tests first, implement to pass
3. **Incremental commits**: Commit after each passing task
4. **Story-by-story delivery**: Complete P1 → P2 → P3 in order

---

## Troubleshooting Commands

```bash
# Reset node_modules (if deps corrupted)
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npm test -- --clearCache

# Check Node.js version
node --version  # Should be v18+

# Kill process on port 4000
lsof -i :4000
kill -9 <PID>

# Verify Socket.io connection from CLI
npx wscat -c ws://localhost:4000
# Should see: Connected (HTTP/1.1 101 Switching Protocols)
```

---

## Development Workflow Summary

```
1. Create feature branch (e.g., feat/user-story-1)
2. Write tests first (TDD per Constitution Principle IV)
3. Run tests → verify they fail (Red)
4. Implement feature code (Green)
5. Refactor for quality (Refactor)
6. Run linting/formatting: npm run lint && npm run format
7. Commit (pre-commit hooks run automatically)
8. Repeat for next task
```

**Time Estimate**: 30 minutes setup + 2-5 days implementation (per constitution timeline)
