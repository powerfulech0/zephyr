# Test Contract: apiService.js

**File Under Test**: `frontend/src/services/apiService.js`
**Test File**: `frontend/tests/unit/apiService.test.js`
**Coverage Target**: ≥80% across all metrics

## Purpose

This contract defines the expected behavior and test coverage requirements for the API service unit tests. The API service is responsible for HTTP communication with the backend REST API.

---

## Functions Under Test

### 1. createPoll(question, options)

**Purpose**: Create a new poll via POST request to `/api/polls`

**Input**:
- `question`: string - Poll question text
- `options`: string[] - Array of poll option texts

**Output**:
- **Success**: Promise resolves to poll object `{ roomCode, question, options, state, createdAt }`
- **Error**: Promise rejects with Error containing message from API or default message

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| CP-001 | Valid poll data | POST to `/api/polls` with JSON body, resolves with poll data | Success path |
| CP-002 | Request headers | Includes `Content-Type: application/json` | Request validation |
| CP-003 | API URL configuration | Uses `API_URL` from env or default `http://localhost:4000` | Configuration |
| CP-004 | Network error (no response) | Rejects with network error message | Error path |
| CP-005 | 400 Bad Request response | Rejects with API error message | Error path |
| CP-006 | 500 Server Error response | Rejects with API error message | Error path |
| CP-007 | Malformed JSON response | Rejects with JSON parsing error | Edge case |
| CP-008 | API error message present | Error message extracted from `data.error` | Error handling |
| CP-009 | API error message missing | Default error message "Failed to create poll" | Error handling |

**Coverage Target**: 100% (function is critical path for poll creation)

---

### 2. getPoll(roomCode)

**Purpose**: Retrieve existing poll via GET request to `/api/polls/{roomCode}`

**Input**:
- `roomCode`: string - Unique poll identifier

**Output**:
- **Success**: Promise resolves to poll object
- **Error**: Promise rejects with Error containing message

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| GP-001 | Valid room code | GET to `/api/polls/{roomCode}`, resolves with poll data | Success path |
| GP-002 | Request URL construction | Correctly interpolates roomCode into URL | Request validation |
| GP-003 | 404 Not Found | Rejects with API error message | Error path |
| GP-004 | Network error | Rejects with network error message | Error path |
| GP-005 | Malformed JSON response | Rejects with JSON parsing error | Edge case |
| GP-006 | API error message present | Error message extracted from `data.error` | Error handling |
| GP-007 | API error message missing | Default error message "Failed to get poll" | Error handling |

**Coverage Target**: 100% (function is critical path for poll retrieval)

---

### 3. checkHealth()

**Purpose**: Check backend health via GET request to `/api/health`

**Input**: None

**Output**:
- **Success**: Promise resolves to health data object
- **Note**: Does NOT throw on `!response.ok` (different from other functions)

**Test Requirements**:

| Test Case ID | Scenario | Expected Behavior | Assertion Type |
|--------------|----------|-------------------|----------------|
| CH-001 | Healthy backend | GET to `/api/health`, resolves with health data | Success path |
| CH-002 | Unhealthy backend (500) | Still resolves with response data (no error thrown) | Edge case |
| CH-003 | Network error | Rejects with network error | Error path |
| CH-004 | Malformed JSON | Rejects with parsing error | Edge case |

**Coverage Target**: 100% (health check used for monitoring)

---

## Mock Configuration

### Global fetch Mock Setup

```javascript
// In test file
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});
```

### Mock Response Structures

**Success Response**:
```javascript
fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({
    roomCode: 'ABC123',
    question: 'Test?',
    options: ['A', 'B'],
    state: 'waiting',
    createdAt: '2025-01-01T00:00:00.000Z'
  })
});
```

**Error Response (400/500)**:
```javascript
fetch.mockResolvedValueOnce({
  ok: false,
  json: async () => ({ error: 'Invalid request' })
});
```

**Network Error**:
```javascript
fetch.mockRejectedValueOnce(new Error('Network failure'));
```

**Malformed JSON**:
```javascript
fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => { throw new SyntaxError('Unexpected token'); }
});
```

---

## Coverage Metrics

### Required Coverage

| Metric | Target | Measurement |
|--------|--------|-------------|
| Statements | ≥80% | Lines of code executed |
| Branches | ≥80% | if/else paths taken |
| Functions | ≥80% | Functions called (should be 100% - only 3 functions) |
| Lines | ≥80% | Non-comment lines executed |

### Branch Coverage Requirements

**createPoll branches**:
- `if (!response.ok)` - TRUE: test CP-005, CP-006
- `if (!response.ok)` - FALSE: test CP-001
- `data.error || 'Failed...'` - TRUE: test CP-008
- `data.error || 'Failed...'` - FALSE: test CP-009

**getPoll branches**:
- `if (!response.ok)` - TRUE: test GP-003
- `if (!response.ok)` - FALSE: test GP-001
- `data.error || 'Failed...'` - TRUE: test GP-006
- `data.error || 'Failed...'` - FALSE: test GP-007

**checkHealth branches**:
- No conditional branches (returns `response.json()` directly)

---

## Test Execution

### Run Tests
```bash
cd frontend
npm test -- apiService.test.js
```

### Check Coverage
```bash
npm test -- apiService.test.js --coverage --collectCoverageFrom='src/services/apiService.js'
```

### Expected Output
```
PASS  tests/unit/apiService.test.js
  apiService
    createPoll
      ✓ creates poll with valid data (Xms)
      ✓ sends correct request headers (Xms)
      ✓ includes API_URL in request (Xms)
      ✓ handles network error before response (Xms)
      ✓ handles 400 error response (Xms)
      ✓ handles 500 error response (Xms)
      ✓ handles malformed JSON response (Xms)
      ✓ throws error with message from API (Xms)
      ✓ throws default error when API error missing (Xms)
    getPoll
      ✓ retrieves poll by room code (Xms)
      ✓ sends GET request to correct endpoint (Xms)
      ✓ handles 404 not found (Xms)
      ✓ handles network error (Xms)
      ✓ handles malformed JSON response (Xms)
      ✓ throws error with message from API (Xms)
      ✓ throws default error when API error missing (Xms)
    checkHealth
      ✓ returns health check data (Xms)
      ✓ sends request to /api/health endpoint (Xms)
      ✓ returns data even if response not ok (Xms)
      ✓ handles JSON parsing errors gracefully (Xms)

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Coverage:
  File              | % Stmts | % Branch | % Funcs | % Lines
  ------------------|---------|----------|---------|--------
  apiService.js     |   100   |   100    |   100   |   100
```

---

## Quality Gates

Before marking apiService tests as complete:

- [ ] All 20+ test cases pass
- [ ] Statement coverage ≥80%
- [ ] Branch coverage ≥80%
- [ ] Function coverage ≥80%
- [ ] Line coverage ≥80%
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] No console.log or debug statements
- [ ] ESLint passes
- [ ] Prettier formatting applied
- [ ] Tests run in <5 seconds

---

## Integration with Existing Tests

This test file is independent but should be run as part of the full test suite:

```bash
cd frontend
npm test  # Runs all tests including apiService.test.js
```

**Existing tests that mock apiService**:
- `tests/contract/HostDashboard.test.js` - Mocks `createPoll` function
- These mocks remain valid and independent from unit tests

---

## Maintenance Notes

**When modifying apiService.js**:
1. Add corresponding test cases to maintain ≥80% coverage
2. Update this contract if function signatures change
3. Ensure error handling remains consistent

**When adding new functions to apiService.js**:
1. Add test cases following the same pattern
2. Update coverage targets in this contract
3. Maintain ≥80% coverage across all metrics
