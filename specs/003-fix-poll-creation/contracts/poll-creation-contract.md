# API Contract: Poll Creation

**Endpoint**: `POST /api/polls`
**Purpose**: Create a new poll and return poll details
**Status**: Existing contract (no changes)

## Request

**Method**: POST
**Path**: `/api/polls`
**Content-Type**: `application/json`

**Body**:
```json
{
  "question": "string (required, 1-500 chars)",
  "options": ["string", "string", ...] // array of 2-5 strings, each 1-100 chars
}
```

**Example**:
```json
{
  "question": "What's your favorite programming language?",
  "options": ["JavaScript", "Python", "Rust", "Go"]
}
```

## Response

**Success (201 Created)**:

**Content-Type**: `application/json`

**Body Structure** (FLAT - fields at top level):
```json
{
  "roomCode": "string (6 chars, e.g., '3B7KWX')",
  "question": "string (echoed from request)",
  "options": ["string", ...] // echoed from request
  "state": "string (always 'waiting' on creation)"
}
```

**Example**:
```json
{
  "roomCode": "3B7KWX",
  "question": "What's your favorite programming language?",
  "options": ["JavaScript", "Python", "Rust", "Go"],
  "state": "waiting"
}
```

**Error Responses**:

**400 Bad Request** - Validation failure:
```json
{
  "error": "Validation error message"
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error** - Server failure:
```json
{
  "error": "Failed to create poll"
}
```

## Contract Validation

### Bug Identified

**Issue**: Frontend expected nested structure `{ poll: { roomCode, question, options, state } }`
**Actual**: Backend returns flat structure `{ roomCode, question, options, state }`

**Evidence**:
- Backend implementation (pollRoutes.js:26-31) returns flat structure
- Frontend code (HostDashboard.jsx:134-135) expects nested structure
- Error message: "TypeError: can't access property 'state', response.poll is undefined"

### Fix Required

**Component**: Frontend (HostDashboard.jsx)
**Change**: Update response handling to use flat structure
**Impact**: No backend changes, no contract changes

**Before**:
```javascript
const response = await createPoll(question, options);
setPoll(response.poll);           // ❌ undefined
setPollState(response.poll.state); // ❌ TypeError
joinSocketRoom(response.poll.roomCode); // ❌ TypeError
```

**After**:
```javascript
const response = await createPoll(question, options);
setPoll(response);                // ✅ Use flat response
setPollState(response.state);     // ✅ Access from top level
joinSocketRoom(response.roomCode); // ✅ Access from top level
```

## Contract Tests

### Backend Contract Test (Existing - No Changes)

**Test**: `POST /api/polls returns correct flat structure`
**Location**: `backend/tests/contract/pollRoutes.test.js`
**Status**: Passing (validates correct backend behavior)

### Frontend Contract Test (Needs Update)

**Test**: `createPoll handles flat response structure`
**Location**: `frontend/tests/contract/HostDashboard.test.js`
**Status**: Needs update to match backend contract
**Changes Required**:
- Mock API response with flat structure
- Verify setPoll receives flat structure
- Verify setPollState receives response.state (not response.poll.state)
- Verify joinSocketRoom receives response.roomCode

## Backwards Compatibility

**Breaking Change**: No
**Reasoning**: This is a bug fix that aligns frontend with existing backend contract. Backend contract remains unchanged.

## Migration Required

**None** - Frontend fix only, no data migration needed
