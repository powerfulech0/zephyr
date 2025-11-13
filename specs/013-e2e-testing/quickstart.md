# Quickstart: End-to-End Testing

**Feature**: 013-e2e-testing
**Date**: 2025-11-11
**Purpose**: Quick validation checklist for E2E testing implementation

## Prerequisites

Before running E2E tests, ensure:

- [ ] Node.js 18+ LTS installed
- [ ] Backend server can start successfully (`cd backend && npm start`)
- [ ] Frontend dev server can start successfully (`cd frontend && npm run dev`)
- [ ] Playwright installed (`npm install -D @playwright/test playwright`)
- [ ] Browser binaries installed (`npx playwright install`)

---

## Setup (One-Time)

### 1. Install E2E Dependencies

```bash
# From repository root
npm install -D @playwright/test@^1.40.0 playwright@^1.40.0 wait-on@^7.0.0
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium firefox webkit
```

### 3. Verify Installation

```bash
npx playwright --version
# Should output: Version 1.40.0 or higher
```

---

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

**Expected Output**:
```
Running 24 tests using 2 workers
  ✓ host-lifecycle.spec.js:7:1 › Host creates poll (2.1s)
  ✓ host-lifecycle.spec.js:15:1 › Host opens voting (1.8s)
  ✓ participant-journey.spec.js:7:1 › Participant joins poll (1.5s)
  ...
  24 passed (38s)
```

### Run Specific User Story Tests

```bash
# P1: Host lifecycle tests only
npm run test:e2e -- tests/e2e/specs/host-lifecycle.spec.js

# P2: Participant journey tests only
npm run test:e2e -- tests/e2e/specs/participant-journey.spec.js

# P3: Multi-user tests only
npm run test:e2e -- tests/e2e/specs/multi-user.spec.js

# P4: Cross-browser tests only
npm run test:e2e -- tests/e2e/specs/cross-browser.spec.js
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e -- --headed
```

### Run Tests in Specific Browser

```bash
# Chromium only
npm run test:e2e -- --project=chromium

# Firefox only
npm run test:e2e -- --project=firefox

# WebKit (Safari) only
npm run test:e2e -- --project=webkit
```

### Run Tests in Debug Mode

```bash
npm run test:e2e -- --debug
```

**Debug Features**:
- Opens Playwright Inspector
- Pauses before each action
- Allows step-by-step execution
- Inspect element locators

---

## Validation Checklist

Run these commands to validate E2E infrastructure is working correctly:

### ✅ Step 1: Verify Application Stack

```bash
# Start backend (Terminal 1)
cd backend && npm start

# Expected: Server running on port 4000

# Start frontend (Terminal 2)
cd frontend && npm run dev

# Expected: Vite dev server running on port 5173
```

### ✅ Step 2: Verify Test Configuration

```bash
# Check Playwright config exists
ls tests/e2e/config/playwright.config.js

# Expected: File exists
```

### ✅ Step 3: Run Single Test (Smoke Test)

```bash
# Run simplest test to verify setup
npm run test:e2e -- tests/e2e/specs/host-lifecycle.spec.js --grep "Host creates poll"
```

**Expected Output**:
```
Running 1 test using 1 worker
  ✓ host-lifecycle.spec.js:7:1 › Host creates poll (2.1s)

  1 passed (2.1s)
```

**If test fails**, check:
- Backend running on port 4000
- Frontend running on port 5173
- No port conflicts
- Playwright browsers installed

### ✅ Step 4: Verify Page Objects

```bash
# Check page object files exist
ls tests/e2e/pages/HostDashboardPage.js
ls tests/e2e/pages/JoinPage.js
ls tests/e2e/pages/VotePage.js

# Expected: All files exist
```

### ✅ Step 5: Verify Test Utilities

```bash
# Check utility files exist
ls tests/e2e/fixtures/pollData.js
ls tests/e2e/fixtures/testUtils.js
ls tests/e2e/helpers/websocketHelpers.js

# Expected: All files exist
```

### ✅ Step 6: Run Multi-Browser Test

```bash
# Run test across all browsers
npm run test:e2e -- tests/e2e/specs/cross-browser.spec.js
```

**Expected Output**:
```
Running 3 tests using 2 workers
  [chromium] › cross-browser.spec.js:7:1 › Works in Chrome ✓ (1.8s)
  [firefox] › cross-browser.spec.js:7:1 › Works in Firefox ✓ (2.1s)
  [webkit] › cross-browser.spec.js:7:1 › Works in Safari ✓ (2.3s)

  3 passed (6.2s)
```

### ✅ Step 7: Verify WebSocket Testing

```bash
# Run WebSocket-dependent tests
npm run test:e2e -- tests/e2e/specs/multi-user.spec.js --grep "concurrent votes"
```

**Expected**: Test captures WebSocket events and validates real-time updates

### ✅ Step 8: Verify Test Cleanup

```bash
# Run test and check no orphaned data
npm run test:e2e -- tests/e2e/specs/host-lifecycle.spec.js

# Then check backend doesn't have orphaned polls
# (should be automatic cleanup via fixtures)
```

### ✅ Step 9: Verify CI Readiness

```bash
# Simulate CI environment
CI=true npm run test:e2e
```

**Expected**:
- Tests run in headless mode
- Parallel execution (2 workers)
- Screenshots on failure
- Tests retry on flakiness

### ✅ Step 10: Verify Reporting

```bash
# Run tests and generate HTML report
npm run test:e2e -- --reporter=html

# Open report
open playwright-report/index.html
```

**Expected**: HTML report shows test results, screenshots, execution times

---

## Success Criteria Validation

Validate that implementation meets success criteria from spec.md:

### SC-001: Host workflow execution time

```bash
npm run test:e2e -- tests/e2e/specs/host-lifecycle.spec.js --reporter=line
```

**Expected**: All host lifecycle tests complete in <30 seconds each

### SC-002: Participant workflow execution time

```bash
npm run test:e2e -- tests/e2e/specs/participant-journey.spec.js --reporter=line
```

**Expected**: All participant tests complete in <20 seconds each

### SC-003: 100% coverage of core workflows

```bash
npm run test:e2e -- --reporter=list
```

**Expected**: Tests exist for:
- ✓ Poll creation
- ✓ Joining poll
- ✓ Voting
- ✓ State changes (open/close)
- ✓ Results viewing

### SC-004: 10 concurrent participants

```bash
npm run test:e2e -- tests/e2e/specs/multi-user.spec.js --grep "10 participants"
```

**Expected**: Test successfully spawns 10 participants and validates behavior

### SC-005: Multi-browser execution

```bash
npm run test:e2e -- --project=chromium --project=firefox --project=webkit
```

**Expected**: All tests pass in all 3 browsers

### SC-006: <5% flakiness rate

```bash
# Run suite 3 times
for i in {1..3}; do npm run test:e2e; done
```

**Expected**: ≥95% of tests pass consistently across runs

### SC-007: Screenshots on failure

```bash
# Force a test failure (temporarily modify assertion)
npm run test:e2e
```

**Expected**: Screenshots saved to `tests/e2e/reports/screenshots/` on failure

### SC-008: Total suite execution <5 minutes

```bash
time npm run test:e2e
```

**Expected**: Total execution time <5 minutes (300 seconds)

---

## Troubleshooting

### Tests fail with "Connection refused"

**Cause**: Backend or frontend not running

**Fix**:
```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run tests
npm run test:e2e
```

### Tests fail with "Browser not found"

**Cause**: Playwright browsers not installed

**Fix**:
```bash
npx playwright install
```

### Tests are flaky (intermittent failures)

**Cause**: Race conditions, timing issues

**Fix**:
1. Check tests use `waitForSelector()` not `setTimeout()`
2. Increase timeouts in `playwright.config.js` if needed
3. Enable retries: `retries: 2` in config

### WebSocket events not captured

**Cause**: Event listener not injected or wrong event names

**Fix**:
1. Verify `captureSocketEvents()` called before actions
2. Check event type names match backend events (e.g., 'vote-update', not 'voteUpdate')
3. Add debug logging: `page.on('console', msg => console.log(msg.text()))`

### Tests pass locally but fail in CI

**Cause**: Environment differences (timing, headless mode)

**Fix**:
1. Run locally with `CI=true npm run test:e2e` to simulate CI
2. Check CI has enough resources (memory, CPU)
3. Increase timeouts for CI environment

### Port conflicts

**Cause**: Ports 4000 or 5173 already in use

**Fix**:
```bash
# Find process using port
lsof -i :4000
lsof -i :5173

# Kill process or configure different ports in test-env.js
```

---

## Quick Reference

### File Locations

```
tests/e2e/
├── config/
│   ├── playwright.config.js    # Main test configuration
│   └── test-env.js              # Environment variables
├── pages/
│   ├── HostDashboardPage.js     # Host UI interactions
│   ├── JoinPage.js              # Join UI interactions
│   └── VotePage.js              # Vote UI interactions
├── specs/
│   ├── host-lifecycle.spec.js   # P1 tests
│   ├── participant-journey.spec.js # P2 tests
│   ├── multi-user.spec.js       # P3 tests
│   └── cross-browser.spec.js    # P4 tests
├── fixtures/
│   ├── pollData.js              # Test data generators
│   └── testUtils.js             # Cleanup fixtures
└── helpers/
    ├── websocketHelpers.js      # WebSocket utilities
    └── browserHelpers.js        # Browser utilities
```

### NPM Scripts

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:headed       # Run with visible browser
npm run test:e2e:debug        # Run in debug mode
npm run test:e2e:report       # Generate HTML report
npm run test:e2e:ci           # Run in CI mode (headless, parallel, retries)
```

### Environment Variables

```bash
BASE_URL=http://localhost:5173   # Frontend URL
API_URL=http://localhost:4000    # Backend URL
WS_URL=ws://localhost:4000       # WebSocket URL
CI=true                          # Enable CI mode
HEADLESS=true                    # Run headless
WORKERS=2                        # Parallel workers
```

---

## Next Steps After Validation

1. **If all checks pass**: Implementation complete, ready for PR
2. **If tests fail**: Review error messages, check troubleshooting section
3. **Add tests to CI**: Update `.github/workflows/` to run E2E tests on PRs
4. **Document edge cases**: Add tests for all 10 edge cases from spec.md
5. **Performance tuning**: Optimize slow tests, add parallelization where possible

---

## Support

- **Documentation**: See `specs/013-e2e-testing/spec.md` and `plan.md`
- **Contracts**: See `specs/013-e2e-testing/contracts/` for interfaces
- **Research**: See `specs/013-e2e-testing/research.md` for framework decision rationale
