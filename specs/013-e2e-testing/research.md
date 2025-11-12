# Research: End-to-End Testing Infrastructure

**Feature**: 013-e2e-testing
**Date**: 2025-11-11
**Purpose**: Resolve technical unknowns for E2E testing framework selection and implementation approach

## Research Questions

1. **E2E Framework Selection**: Which E2E framework (Playwright, Cypress, Puppeteer) best supports WebSocket testing, multi-browser execution, and CI/CD integration?
2. **WebSocket Testing Strategy**: How to reliably test real-time WebSocket communication in E2E tests?
3. **Test Data Management**: Best practices for test data generation and cleanup in E2E tests?
4. **CI/CD Integration**: How to integrate E2E tests into existing GitHub Actions workflow with minimal flakiness?

---

## Decision 1: E2E Framework Selection

### Decision: Playwright

### Rationale

**Playwright** is the optimal choice for Zephyr's E2E testing requirements based on the following analysis:

#### Requirements Mapping

| Requirement | Playwright | Cypress | Puppeteer |
|------------|-----------|---------|-----------|
| Multi-browser (Chrome, Firefox, Safari) | ✅ Native support all 3 | ⚠️ Limited Safari | ❌ Chrome/Edge only |
| WebSocket testing | ✅ Full support | ✅ Via cy.intercept() | ⚠️ Manual implementation |
| Parallel execution | ✅ Built-in | ✅ Paid (Cypress Cloud) | ⚠️ Manual setup |
| Auto-wait/retry | ✅ Built-in | ✅ Built-in | ❌ Manual |
| Screenshots/video on failure | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| CI/CD integration | ✅ GitHub Actions native | ✅ Good support | ✅ Good support |
| Test isolation | ✅ Fresh context per test | ⚠️ Shared browser context | ✅ Fresh context |
| Network simulation | ✅ Built-in | ✅ Via cy.intercept() | ⚠️ Basic |
| TypeScript/JavaScript support | ✅ Both | ✅ Both | ✅ Both |
| Learning curve | Medium | Low | High |
| Active maintenance | ✅ Microsoft | ✅ Cypress.io | ⚠️ Google (slower) |

#### Key Advantages for Zephyr

1. **Cross-Browser Support**: Requirement FR-006 mandates Chrome, Firefox, Safari testing. Playwright is the only framework with first-class Safari support without browser limitations.

2. **WebSocket Testing**: Zephyr is a real-time WebSocket application (Constitution Principle I). Playwright provides native WebSocket inspection and mocking capabilities:
   ```javascript
   // Playwright WebSocket testing example
   page.on('websocket', ws => {
     console.log(`WebSocket opened: ${ws.url()}`);
     ws.on('framesent', event => console.log(event.payload));
     ws.on('framereceived', event => console.log(event.payload));
   });
   ```

3. **Parallel Execution**: Requirement SC-008 demands <5 min total suite execution. Playwright supports parallel test execution out-of-the-box without additional infrastructure costs (unlike Cypress Cloud).

4. **Test Isolation**: Each Playwright test runs in a fresh browser context, preventing test pollution—critical for testing poll isolation (Constitution Principle III).

5. **CI/CD Integration**: GitHub Actions is already in use (see .github/workflows/). Playwright has official GitHub Actions with caching, artifact upload, and parallel runners.

6. **Performance**: Playwright uses browser automation protocols directly, resulting in faster execution than Cypress (which runs inside the browser).

#### Alternatives Considered

**Cypress**:
- **Rejected because**: Limited Safari support (WebKit experimental), parallel execution requires paid Cypress Cloud, runs inside browser (slower, architectural limitations)
- **When to reconsider**: If team prioritizes ease of learning or already has Cypress expertise

**Puppeteer**:
- **Rejected because**: Chrome/Edge only (fails FR-006 multi-browser requirement), requires more manual implementation (auto-wait, screenshots, retries)
- **When to reconsider**: If only Chrome testing is required or team has deep Puppeteer expertise

### Implementation Notes

- **Version**: Playwright 1.40+ (latest stable)
- **Test Runner**: Playwright Test (built-in test runner with fixtures, parallelization, reporting)
- **Language**: JavaScript ES6+ (consistent with project stack)
- **Configuration**: `tests/e2e/config/playwright.config.js`
- **CI/CD**: GitHub Actions with `@playwright/test` runner

---

## Decision 2: WebSocket Testing Strategy

### Decision: Event Listener Pattern + Playwright WebSocket API

### Rationale

Zephyr's real-time features (vote updates, participant joins/leaves, state changes) require robust WebSocket testing. Strategy combines:

1. **Playwright WebSocket API** for connection monitoring:
   ```javascript
   // Monitor WebSocket connections
   const wsConnections = [];
   page.on('websocket', ws => {
     wsConnections.push(ws);
     ws.on('framereceived', frame => {
       const event = JSON.parse(frame.payload);
       // Assert on Socket.io events
     });
   });
   ```

2. **Page Evaluation** for Socket.io event assertions:
   ```javascript
   // Inject listener into page context
   await page.evaluate(() => {
     window.socketEvents = [];
     window.socket.on('vote-update', data => {
       window.socketEvents.push({ type: 'vote-update', data });
     });
   });

   // Later: assert on captured events
   const events = await page.evaluate(() => window.socketEvents);
   expect(events).toContainEqual({ type: 'vote-update', data: expectedVotes });
   ```

3. **Wait Helpers** for real-time assertions:
   ```javascript
   // Wait for WebSocket event with timeout
   async function waitForSocketEvent(page, eventType, timeout = 2000) {
     return page.waitForFunction(
       type => window.socketEvents?.some(e => e.type === type),
       { timeout },
       eventType
     );
   }
   ```

#### Why This Approach

- **Reliable**: Captures actual WebSocket frames sent/received, not just UI updates
- **Testable**: Validates server → client communication (vote-update, poll-state-changed events)
- **Timing**: Built-in wait helpers prevent flaky tests from race conditions
- **Debuggable**: WebSocket frames logged to test output on failure

#### Alternatives Considered

- **Mock Socket.io**: Rejected—tests would validate mocks, not real WebSocket logic
- **Network interception only**: Rejected—can't assert on Socket.io event payloads easily
- **Polling UI state**: Rejected—can't distinguish between WebSocket update vs. poll refresh

---

## Decision 3: Test Data Management

### Decision: Test Data Generators + Automatic Cleanup

### Rationale

E2E tests must generate realistic test data (polls, participants, votes) and clean up after execution to prevent test pollution and resource leaks.

#### Strategy

1. **Test Data Generators** (`tests/e2e/fixtures/pollData.js`):
   ```javascript
   export function generatePoll(overrides = {}) {
     return {
       question: `Test Poll ${Date.now()}`,
       options: ['Option A', 'Option B', 'Option C'],
       ...overrides
     };
   }

   export function generateParticipant(overrides = {}) {
     return {
       nickname: `Tester-${Math.random().toString(36).slice(2, 8)}`,
       ...overrides
     };
   }
   ```

2. **Automatic Cleanup** using Playwright fixtures:
   ```javascript
   // tests/e2e/fixtures/testUtils.js
   export const test = base.extend({
     pollCleanup: async ({}, use) => {
       const createdPolls = [];

       await use({
         trackPoll: (roomCode) => createdPolls.push(roomCode)
       });

       // Cleanup after test
       for (const roomCode of createdPolls) {
         await deletePoll(roomCode); // API call or direct DB cleanup
       }
     }
   });
   ```

3. **Isolated Test Data**: Each test generates unique identifiers to prevent collisions:
   - Poll questions include timestamp: `"Test Poll 1699833600000"`
   - Participant nicknames include random suffix: `"Tester-a7k3m9"`
   - Room codes generated by backend, guaranteed unique

#### Benefits

- **No manual cleanup**: Tests automatically clean up after themselves
- **Parallel-safe**: Unique identifiers prevent test collision
- **Realistic**: Uses same data generation as production
- **Fast**: No need to reset entire database between tests

#### Alternatives Considered

- **Database reset between tests**: Rejected—too slow, breaks parallel execution
- **Shared test data**: Rejected—causes flakiness in parallel execution
- **Manual cleanup**: Rejected—error-prone, doesn't run on test failure

---

## Decision 4: CI/CD Integration

### Decision: GitHub Actions with Playwright Container

### Rationale

Integrate E2E tests into existing GitHub Actions workflow with containerized execution for consistency and reproducibility.

#### Strategy

1. **Dedicated Workflow** (`.github/workflows/e2e-tests.yml`):
   ```yaml
   name: E2E Tests

   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]

   jobs:
     e2e-tests:
       runs-on: ubuntu-latest
       container:
         image: mcr.microsoft.com/playwright:v1.40.0-focal

       steps:
         - uses: actions/checkout@v3

         - name: Install dependencies
           run: npm ci

         - name: Start backend
           run: npm run start:backend &

         - name: Start frontend
           run: npm run start:frontend &

         - name: Wait for services
           run: npx wait-on http://localhost:4000 http://localhost:5173

         - name: Run E2E tests
           run: npm run test:e2e

         - name: Upload failure artifacts
           if: failure()
           uses: actions/upload-artifact@v3
           with:
             name: e2e-failures
             path: tests/e2e/reports/
   ```

2. **Parallel Execution**: Playwright shards tests across multiple workers:
   ```javascript
   // playwright.config.js
   export default {
     workers: process.env.CI ? 2 : 1, // 2 parallel workers in CI
     fullyParallel: true,
     retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
   };
   ```

3. **Flakiness Mitigation**:
   - **Automatic retries**: Failed tests retry up to 2 times in CI
   - **Wait helpers**: Use `page.waitForSelector()` instead of fixed timeouts
   - **Test isolation**: Fresh browser context per test
   - **Deterministic data**: Time-based test data for reproducibility

#### Benefits

- **Fast**: Parallel execution + container caching = <5 min suite runtime
- **Reliable**: Containerized execution eliminates environment differences
- **Debuggable**: Screenshots/videos uploaded on failure
- **Integrated**: Runs on every PR, blocks merge on failure

#### Alternatives Considered

- **Jenkins**: Rejected—GitHub Actions already in use, no Jenkins infrastructure
- **CircleCI**: Rejected—no benefit over GitHub Actions for this use case
- **Local execution only**: Rejected—violates Constitution Principle X (Deployment Excellence)

---

## Best Practices Summary

### Test Organization

- **One test file per user story**: `host-lifecycle.spec.js`, `participant-journey.spec.js`, etc.
- **Page Object Model**: Abstract UI interactions into reusable page classes
- **Fixtures**: Use Playwright fixtures for test data and cleanup
- **Naming**: Descriptive test names matching acceptance scenarios from spec.md

### Performance

- **Parallel execution**: Run tests in parallel (2 workers in CI)
- **Selective execution**: Tag tests by priority (`@P1`, `@P2`) for incremental runs
- **Fast feedback**: Run P1 tests on every commit, full suite nightly

### Reliability

- **Auto-wait**: Use Playwright's built-in waiting mechanisms
- **Retries**: Retry failed tests up to 2 times in CI
- **Isolation**: Fresh browser context per test
- **Cleanup**: Automatic cleanup via fixtures

### Debugging

- **Screenshots**: Capture on failure automatically
- **Videos**: Optional video recording for debugging
- **Trace files**: Playwright trace viewer for step-by-step replay
- **Logs**: Console output captured in test reports

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Which E2E framework? | Playwright (multi-browser, WebSocket support, CI/CD integration) |
| How to test WebSockets? | Playwright WebSocket API + event listener pattern |
| Test data management? | Generators + automatic cleanup via fixtures |
| CI/CD integration? | GitHub Actions with Playwright container, parallel execution |
| Test flakiness concerns? | Auto-wait, retries, isolation, deterministic data |
| Performance targets achievable? | Yes—parallel execution + container caching = <5 min |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @playwright/test | ^1.40.0 | E2E test framework and test runner |
| playwright | ^1.40.0 | Browser automation library |
| wait-on | ^7.0.0 | Wait for services to be ready in CI |

---

## Next Steps

1. **Phase 1: Design & Contracts** - Generate data-model.md, contracts/, quickstart.md
2. **Phase 2: Tasks** - Break down implementation into prioritized tasks (P1 → P2 → P3 → P4)
3. **Implementation** - TDD approach: write tests → fail → implement page objects/helpers → pass
