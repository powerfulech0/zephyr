# Integration Tests

This directory contains integration tests that validate production infrastructure.

## Test Classification

### ✅ Always Run (Lightweight)
These tests run in all environments and don't require full infrastructure:

- `circuitBreaker.test.js` - Circuit breaker pattern (no DB/Redis needed)
- `correlationIdTracking.test.js` - Request correlation IDs

### 🔧 Infrastructure Required
These tests require PostgreSQL and/or Redis:

- `databaseRetry.test.js` - Database retry logic with PostgreSQL
- `securityHeaders.test.js` - Security headers validation
- `websocketReconnection.test.js` - WebSocket session persistence

**To run:**
```bash
docker compose up -d
npm run migrate:up
npm test -- tests/integration
```

### ⏭️ Skipped Tests
These tests are skipped by default (renamed to `.test.js.skip`):

- `multiInstanceWebSocket.test.js.skip` - Multi-instance WebSocket with Redis adapter
- `gracefulShutdown.test.js.skip` - Server graceful shutdown testing

**Why skipped:**
- Require complex multi-server setup
- Take 60+ seconds to run
- Test production deployment scenarios
- Not critical for development workflow

**To run skipped tests:**
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Rename test file
mv tests/integration/multiInstanceWebSocket.test.js.skip tests/integration/multiInstanceWebSocket.test.js

# 3. Run test
npm test -- tests/integration/multiInstanceWebSocket.test.js

# 4. Rename back when done
mv tests/integration/multiInstanceWebSocket.test.js tests/integration/multiInstanceWebSocket.test.js.skip
```

## CI Behavior

In CI (GitHub Actions), tests requiring infrastructure will:
1. Wait up to 60s for PostgreSQL + Redis (via globalSetup.js)
2. Run if services are ready
3. Fail with clear error message if services unavailable

Skipped tests (`.test.js.skip`) are never run in CI.

## Coverage

These integration tests provide:
- **Database connectivity**: Connection pooling, retry logic
- **Redis integration**: Session management, caching
- **WebSocket real-time**: Socket.io with Redis adapter
- **Security**: Headers, rate limiting, input validation
- **Resilience**: Circuit breakers, graceful degradation

Full test suite with infrastructure achieves **95.53% coverage**.
