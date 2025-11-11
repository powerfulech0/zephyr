# Quickstart: Service Layer Unit Tests

**Feature**: 007-service-layer-tests
**Purpose**: Quick reference for running and maintaining service layer unit tests

## TL;DR

```bash
cd frontend

# Run service layer tests only
npm test -- apiService.test.js
npm test -- socketService.test.js

# Run with coverage
npm test -- --coverage --collectCoverageFrom='src/services/*.js'

# Run all tests
npm test

# Watch mode (re-run on file changes)
npm test -- --watch apiService.test.js
```

---

## Quick Commands

### Run Specific Test File

```bash
cd frontend

# API service tests
npm test -- apiService.test.js

# Socket service tests
npm test -- socketService.test.js

# Both service tests
npm test -- src/services
```

### Check Coverage

```bash
# Coverage for specific file
npm test -- apiService.test.js --coverage

# Coverage for all services
npm test -- --coverage --collectCoverageFrom='src/services/*.js'

# Full coverage report
npm test -- --coverage
```

### Development Workflow

```bash
# Watch mode - auto-rerun on changes
npm test -- --watch apiService.test.js

# Verbose output for debugging
npm test -- --verbose apiService.test.js

# Run single test by name
npm test -- -t "creates poll with valid data"
```

---

## File Locations

```
frontend/
├── src/services/
│   ├── apiService.js         # HTTP API service (code under test)
│   └── socketService.js      # WebSocket service (code under test)
└── tests/unit/
    ├── apiService.test.js    # API service unit tests
    └── socketService.test.js # Socket service unit tests
```

---

## Coverage Targets

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| apiService.js | ≥80% | ≥80% | ≥80% | ≥80% |
| socketService.js | ≥80% | ≥80% | ≥80% | ≥80% |

**Verify Coverage**:
```bash
npm test -- --coverage --collectCoverageFrom='src/services/*.js'
```

Look for this output:
```
Coverage:
  File                | % Stmts | % Branch | % Funcs | % Lines
  --------------------|---------|----------|---------|--------
  apiService.js       |   ≥80   |   ≥80    |   ≥80   |   ≥80
  socketService.js    |   ≥80   |   ≥80    |   ≥80   |   ≥80
```

---

## Test Structure Overview

### apiService.test.js

**Tests 3 functions**:
- `createPoll(question, options)` - Create new poll
- `getPoll(roomCode)` - Retrieve existing poll
- `checkHealth()` - Backend health check

**~20 test cases covering**:
- Success scenarios
- Network errors
- HTTP error responses (400, 500, 404)
- Malformed JSON
- Error message extraction

### socketService.test.js

**Tests 18+ functions**:
- Event emission: `joinRoom`, `submitVote`, `changePollState`, `joinSocketRoom`
- Event listeners: `on*` functions (6 functions)
- Event cleanup: `off*` functions (4 functions)
- Connection management: status, reconnection, disconnect
- Internal event handlers: connect, disconnect, reconnecting

**~35-40 test cases covering**:
- Promise-based event emission
- Listener registration/cleanup
- Connection events and callbacks
- Auto-rejoin with sessionStorage
- Edge cases (missing storage, failed rejoin, etc.)

---

## Common Patterns

### Arrange-Act-Assert

```javascript
test('creates poll with valid data', async () => {
  // Arrange - setup mocks
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ roomCode: 'ABC123' })
  });

  // Act - call function
  const result = await createPoll('Question?', ['A', 'B']);

  // Assert - verify behavior
  expect(result).toEqual({ roomCode: 'ABC123' });
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:4000/api/polls',
    expect.objectContaining({ method: 'POST' })
  );
});
```

### Testing Async Errors

```javascript
test('handles network error', async () => {
  fetch.mockRejectedValueOnce(new Error('Network failure'));

  await expect(
    createPoll('Q', ['A'])
  ).rejects.toThrow('Network failure');
});
```

### Mocking Socket Events

```javascript
test('joinRoom resolves on success', async () => {
  mockSocket.emit.mockImplementation((event, payload, callback) => {
    callback({ success: true, poll: { roomCode: 'ABC123' } });
  });

  const result = await joinRoom('ABC123', 'Alice');

  expect(result).toEqual({ roomCode: 'ABC123' });
});
```

---

## Troubleshooting

### Tests Failing?

**Check mock setup**:
```javascript
beforeEach(() => {
  fetch.mockClear();        // For apiService tests
  jest.clearAllMocks();     // For socketService tests
  sessionStorage.clear();   // For socketService tests
});
```

**Check async handling**:
- Use `async/await` in test functions
- Use `await expect(...).rejects.toThrow()` for errors

**Check imports**:
- Mock before importing service: `jest.mock('socket.io-client')`

### Coverage Not Reaching 80%?

**Check uncovered lines**:
```bash
npm test -- --coverage --collectCoverageFrom='src/services/apiService.js'
```

Look for red/yellow lines in coverage report.

**Common missing coverage**:
- Error branches (`if (!response.ok)`)
- Default error messages (`data.error || 'Failed...'`)
- Edge cases (malformed JSON, missing sessionStorage)

**Add test cases for uncovered branches**.

### Tests Running Slow?

**Target**: <10 seconds for both test files combined

**If slower**:
- Check for missing `mockClear()` in `beforeEach`
- Check for unnecessary `waitFor()` or delays
- Ensure tests don't wait for real timeouts

---

## Pre-Commit Checklist

Before committing:

- [ ] All tests pass: `npm test`
- [ ] Coverage ≥80%: `npm test -- --coverage`
- [ ] No console.log statements
- [ ] ESLint passes: `npm run lint`
- [ ] Prettier formatting: `npm run format`

---

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Every push to feature branch
- Every pull request
- Before merge to main

**CI Command**:
```bash
cd frontend && npm test -- --ci --maxWorkers=2 --coverage
```

**Coverage reports** uploaded to CI artifacts.

---

## Related Documentation

- **Test Contracts**:
  - [apiService Test Contract](contracts/apiService-test-contract.md)
  - [socketService Test Contract](contracts/socketService-test-contract.md)
- **Research**: [research.md](research.md) - Mocking patterns and best practices
- **Test Structure**: [data-model.md](data-model.md) - Detailed test organization
- **Feature Spec**: [spec.md](spec.md) - User stories and requirements

---

## Need Help?

**Check existing tests for patterns**:
- `frontend/tests/contract/HostDashboard.test.js` - Socket mocking example
- `frontend/tests/unit/components.test.js` - Component testing patterns

**Common Jest matchers**:
- `expect(value).toBe(expected)` - Strict equality
- `expect(value).toEqual(expected)` - Deep equality
- `expect(fn).toHaveBeenCalled()` - Mock called
- `expect(fn).toHaveBeenCalledWith(arg1, arg2)` - Mock called with args
- `await expect(promise).rejects.toThrow(message)` - Async error
- `expect.any(Function)` - Matches any function (for callbacks)

**Jest documentation**: https://jestjs.io/docs/getting-started
