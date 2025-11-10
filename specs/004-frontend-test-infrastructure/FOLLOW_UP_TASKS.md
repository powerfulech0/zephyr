# Follow-Up Tasks: Frontend Code Quality

**Context**: Feature 004 (Frontend Test Infrastructure) is complete. This document tracks remaining work to bring the existing codebase up to quality standards using the new infrastructure.

**Status**: NOT STARTED
**Priority**: P2 (Can be done incrementally)
**Estimated Effort**: 2-3 sprints

---

## Quick Wins (Can Do Immediately)

### QW-1: Auto-fix Formatting Issues
**Effort**: 5 minutes
**Command**:
```bash
cd frontend && npm run format
```
**Files Affected**: 2 files (VotePage.jsx, socketService.js)
**Impact**: Fixes formatting warnings

### QW-2: Auto-fix Linting Issues
**Effort**: 10 minutes
**Command**:
```bash
cd frontend && npm run lint:fix
```
**Impact**: Auto-fixes some of the 39 linting problems
**Note**: Will not fix all issues (some require manual intervention)

---

## Feature: Fix Frontend Linting Errors

**Goal**: Resolve all 39 linting problems (23 errors, 16 warnings)

### Task Group 1: PropTypes Validation (13 errors)

**Files**:
- `src/components/ParticipantCounter.jsx` - Missing `count` prop
- `src/components/PollControls.jsx` - Missing `pollState`, `onOpenPoll`, `onClosePoll` props
- `src/components/PollResults.jsx` - Missing `options`, `counts`, `percentages`, `pollState` props

**Tasks**:
- [ ] Install `prop-types` package if not installed
- [ ] Add PropTypes validation to ParticipantCounter
- [ ] Add PropTypes validation to PollControls
- [ ] Add PropTypes validation to PollResults
- [ ] Run `npm run lint` to verify fixes

**Estimated Effort**: 1 hour

---

### Task Group 2: Accessibility Issues (4 errors)

**Issue**: Form labels not associated with controls (jsx-a11y/label-has-associated-control)

**Files**:
- `src/pages/HostDashboard.jsx` (lines 182, 196)
- `src/pages/JoinPage.jsx` (lines 79, 95)

**Tasks**:
- [ ] Fix HostDashboard form labels (add htmlFor or nest input inside label)
- [ ] Fix JoinPage form labels (add htmlFor or nest input inside label)
- [ ] Test forms to ensure they still work correctly
- [ ] Run `npm run lint` to verify fixes

**Estimated Effort**: 30 minutes

---

### Task Group 3: Array Key Issues (3 errors)

**Issue**: Using array index as key (react/no-array-index-key)

**Files**:
- `src/pages/HostDashboard.jsx` (line 198)
- `src/pages/VotePage.jsx` (line 196)
- `src/components/PollResults.jsx` (line 21)

**Tasks**:
- [ ] Replace array index keys with unique identifiers
- [ ] Verify components re-render correctly
- [ ] Run tests to ensure no regressions
- [ ] Run `npm run lint` to verify fixes

**Estimated Effort**: 45 minutes

---

### Task Group 4: Remove Console Statements (15 warnings)

**Issue**: console.log statements in production code (no-console)

**Files**:
- `src/pages/HostDashboard.jsx` (6 warnings)
- `src/services/socketService.js` (9 warnings)

**Tasks**:
- [ ] Replace console.log with proper logger in HostDashboard
- [ ] Replace console.log with proper logger in socketService
- [ ] Consider using a logging library (pino, winston) or remove logs
- [ ] Run `npm run lint` to verify fixes

**Estimated Effort**: 1 hour

---

### Task Group 5: Miscellaneous Issues (5 errors + 1 warning)

**Issues**:
- Unused imports: `disconnect` in HostDashboard.jsx and VotePage.jsx (2 errors)
- Button missing type attribute: PollControls.jsx line 30 (1 error)
- For-of loop restriction: HostDashboard.jsx line 119 (1 error)
- Unescaped entity: JoinPage.jsx line 115 (1 error)
- Line length: socketService.js line 98 (1 warning)

**Tasks**:
- [ ] Remove unused `disconnect` imports
- [ ] Add `type="button"` to button in PollControls
- [ ] Refactor for-of loop to use array methods
- [ ] Escape apostrophe in JoinPage
- [ ] Break long line in socketService
- [ ] Run `npm run lint` to verify fixes

**Estimated Effort**: 30 minutes

---

## Feature: Fix Integration Test Failures

**Goal**: Make all tests in `tests/integration/userFlows.test.js` pass

### Current Failures (3 tests)

#### Test 1: Host Poll Control Flow
**Error**: `joinSocketRoom is not a function`
**Root Cause**: Socket service mock incomplete

**Tasks**:
- [ ] Review socket service mock in `src/services/__mocks__/socketService.js`
- [ ] Add missing `joinSocketRoom` export to mock
- [ ] Verify test passes
- [ ] Run `npm test` to confirm fix

**Estimated Effort**: 30 minutes

---

#### Test 2: Component Rendering Issues
**Error**: Unable to find elements, DOM is empty
**Root Cause**: Component not rendering due to missing dependencies or errors

**Tasks**:
- [ ] Debug why component renders empty `<div />`
- [ ] Check if pollState is properly initialized
- [ ] Review console errors in test output
- [ ] Fix underlying component or test setup issue
- [ ] Run `npm test` to confirm fix

**Estimated Effort**: 1-2 hours

---

#### Test 3: Error Boundary Testing
**Error**: TypeError in PollControls (reading 'toUpperCase' of undefined)
**Root Cause**: pollState is undefined, defensive coding needed

**Tasks**:
- [ ] Add null/undefined checks in PollControls.jsx
- [ ] Ensure pollState defaults to valid value
- [ ] Add error boundary tests if not present
- [ ] Run `npm test` to confirm fix

**Estimated Effort**: 1 hour

---

## Feature: Increase Test Coverage to 80%

**Goal**: Achieve 80% coverage across all metrics (branches, functions, lines, statements)

**Current Coverage**: 44.97% overall

### Phase 1: Service Layer Tests (0% → 80%)

#### Task: Test apiService.js
**Current Coverage**: 0%
**Target**: 80%

**Test Cases Needed**:
- [ ] Test `createPoll()` with valid data
- [ ] Test `createPoll()` with network error
- [ ] Test `changePollState()` success
- [ ] Test `changePollState()` failure
- [ ] Test `submitVote()` success
- [ ] Test `submitVote()` failure
- [ ] Test error handling and retries
- [ ] Mock fetch/axios appropriately

**Estimated Effort**: 3-4 hours

---

#### Task: Test socketService.js
**Current Coverage**: 0%
**Target**: 80%

**Test Cases Needed**:
- [ ] Test `connectToServer()` success
- [ ] Test `connectToServer()` failure
- [ ] Test `joinSocketRoom()` emits correct event
- [ ] Test `submitVote()` emits correct event
- [ ] Test event listeners registration
- [ ] Test `disconnect()` cleanup
- [ ] Mock socket.io-client appropriately

**Estimated Effort**: 4-5 hours

---

### Phase 2: Page Component Tests (0-60% → 80%)

#### Task: Test JoinPage.jsx
**Current Coverage**: 0%
**Target**: 80%

**Test Cases Needed**:
- [ ] Test initial render
- [ ] Test form submission with valid input
- [ ] Test form validation (room code format)
- [ ] Test form validation (nickname required)
- [ ] Test error handling
- [ ] Test navigation after successful join

**Estimated Effort**: 2-3 hours

---

#### Task: Increase HostDashboard.jsx Coverage
**Current Coverage**: 60%
**Target**: 80%

**Uncovered Areas** (lines 37-38, 42-43, 50-51, 55-56, 66-68, 74, 90-91, etc.):
- [ ] Test error states
- [ ] Test edge cases in poll creation
- [ ] Test socket event handlers
- [ ] Test cleanup on unmount
- [ ] Test all button click handlers
- [ ] Test all conditional renders

**Estimated Effort**: 3-4 hours

---

#### Task: Increase VotePage.jsx Coverage
**Current Coverage**: 76%
**Target**: 80%

**Uncovered Areas** (lines 38-40, 57-59, 64, 72-74, etc.):
- [ ] Test error states
- [ ] Test vote submission edge cases
- [ ] Test socket reconnection scenarios
- [ ] Test all conditional renders

**Estimated Effort**: 2 hours

---

### Phase 3: Remaining Components

#### Task: Test VoteConfirmation.jsx
**Current Coverage**: 0% (but simple component)
**Target**: 80%

**Test Cases Needed**:
- [ ] Test render with message
- [ ] Test render with different states

**Estimated Effort**: 30 minutes

---

## Summary of Effort

| Category | Tasks | Estimated Effort |
|----------|-------|------------------|
| Quick Wins | 2 | 15 minutes |
| Linting Fixes | 5 task groups | 4 hours |
| Integration Tests | 3 tests | 2.5-4.5 hours |
| Unit Tests - Services | 2 modules | 7-9 hours |
| Unit Tests - Pages | 4 components | 7.5-9.5 hours |
| **TOTAL** | | **21-27 hours** |

**Recommendation**: Break this into 2-3 sprints:
- **Sprint 1**: Quick wins + linting fixes + integration tests (6-8 hours)
- **Sprint 2**: Service layer tests (7-9 hours)
- **Sprint 3**: Page component tests (7.5-9.5 hours)

---

## Validation Checklist

After completing all tasks, verify:

- [ ] `npm run lint` shows 0 errors, 0 warnings
- [ ] `npm run format:check` passes
- [ ] `npm test` shows all tests passing
- [ ] Coverage report shows ≥80% for all metrics (branches, functions, lines, statements)
- [ ] `npm run test:ci` passes (simulates CI environment)
- [ ] Pre-commit hook passes without issues
- [ ] CI pipeline passes on GitHub Actions

---

## Notes

- These tasks are **separate from feature 004** (which is complete)
- They can be done **incrementally** over time
- The test infrastructure **is working correctly** by detecting these issues
- Each task group can be completed independently
- Tests should be written following the patterns in `tests/contract/HostDashboard.test.js`

---

**Created**: 2025-11-10
**Related Feature**: 004-frontend-test-infrastructure
**Status**: Backlog
**Assignee**: TBD
