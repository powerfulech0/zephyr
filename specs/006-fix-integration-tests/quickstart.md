# Quickstart: Fix Failing Integration Tests

**Feature**: 006-fix-integration-tests
**Date**: 2025-11-10

## Overview

This quickstart guide validates that the integration test fixes are working correctly. It provides commands to reproduce the failures, verify the fixes, and ensure no regressions.

## Prerequisites

- Node.js 18+ LTS installed
- Frontend dependencies installed (`cd frontend && npm install`)
- Working directory: `/home/gregrearden/Development/zephyr`

## Quick Validation

### 1. Reproduce the Failing Tests (Before Fix)

```bash
cd frontend
npm test -- tests/integration/userFlows.test.js
```

**Expected Output (Before Fix)**:
```
FAIL tests/integration/userFlows.test.js
  Host Poll Control Flow
    ✕ should allow host to change poll state from waiting to open

  Connection Status and Reconnection (User Story 3)
    ✕ should display connection status indicator

  [Additional test failures with error messages like:]
  - TypeError: joinSocketRoom is not a function
  - Unable to find elements, DOM is empty (found only <div />)
  - Cannot read properties of undefined (reading 'toUpperCase')
```

### 2. Apply the Fixes

**Fix 1: Verify Socket Service Mock (Already Exported)**

Check that the mock exports all required functions:
```bash
grep "export.*joinSocketRoom" frontend/src/services/__mocks__/socketService.js
```

**Expected**: Line showing `export const joinSocketRoom = jest.fn();`

**Fix 2: Update PollControls PropTypes**

Edit `frontend/src/components/PollControls.jsx` line 49:
```javascript
// Before
pollState: PropTypes.string.isRequired,

// After
pollState: PropTypes.string,
```

**Fix 3: Debug Component Rendering (If Needed)**

If tests still fail with empty DOM, investigate HostDashboard state initialization.

### 3. Run Tests After Fixes

```bash
cd frontend
npm test -- tests/integration/userFlows.test.js
```

**Expected Output (After Fix)**:
```
PASS tests/integration/userFlows.test.js
  Host Poll Creation Flow (User Story 1)
    ✓ should allow host to create a poll with question and options
    ✓ should validate form and show error for missing question
    ✓ should validate form and require at least 2 options

  Participant Join and Vote Flow (User Story 2)
    ✓ should render vote page with poll information
    ✓ should allow participant to submit a vote
    ✓ should show voting closed message when poll state is closed

  Host Poll Control Flow
    ✓ should allow host to change poll state from waiting to open

  Connection Status and Reconnection (User Story 3)
    ✓ should display connection status indicator

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

### 4. Run Full Frontend Test Suite

```bash
cd frontend
npm test
```

**Expected Output**:
```
PASS tests/contract/HostDashboard.test.js
PASS tests/integration/userFlows.test.js
PASS tests/unit/components.test.js
PASS tests/unit/roomCodeFormatter.test.js

Test Suites: 4 passed, 4 total
Tests:       XX passed, XX total
Coverage:    Maintained or improved
```

**Success Criteria**:
- ✅ All tests pass (0 failures)
- ✅ No console errors or warnings
- ✅ Test coverage ≥ previous level
- ✅ No new PropTypes warnings

## Step-by-Step Debugging (If Tests Still Fail)

### Debug Step 1: Check Mock Setup

Verify the mock file is in the correct location:
```bash
ls -la frontend/src/services/__mocks__/socketService.js
```

Check Jest is using the mock:
```bash
cd frontend
npm test -- tests/integration/userFlows.test.js --verbose
```

Look for: `Using mock implementation of socketService`

### Debug Step 2: Inspect Component Rendering

Add debug output to the test:
```javascript
const { container } = render(
  <BrowserRouter>
    <HostDashboard />
  </BrowserRouter>
);

console.log('Rendered HTML:', container.innerHTML);
```

Run the test:
```bash
npm test -- tests/integration/userFlows.test.js --verbose
```

Check the console output for actual rendered HTML.

### Debug Step 3: Check for React Errors

Add error boundary logging in tests:
```javascript
const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// ... run test ...

expect(errorSpy).not.toHaveBeenCalled();
errorSpy.mockRestore();
```

### Debug Step 4: Verify Async Handling

Ensure all async operations use `waitFor`:
```javascript
await waitFor(() => {
  expect(screen.getByText('Open Voting')).toBeInTheDocument();
});
```

Increase timeout if needed:
```javascript
await waitFor(() => {
  expect(screen.getByText('Open Voting')).toBeInTheDocument();
}, { timeout: 3000 });
```

## Manual Testing (Optional)

While this feature fixes automated tests, you can manually verify the components work:

### Test 1: Create Poll and Open Voting (Host Flow)

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

1. Open browser to `http://localhost:5173`
2. Fill in poll question and at least 2 options
3. Click "Create Poll"
4. Verify poll details display
5. Verify "Open Voting" button appears
6. Click "Open Voting"
7. Verify button changes to "Close Voting"
8. Verify no console errors

### Test 2: View Poll Status (Participant Flow)

1. In same browser session, open new tab
2. Navigate to `http://localhost:5173`
3. Enter room code from host dashboard
4. Enter a nickname
5. Click "Join Poll"
6. Verify poll question and options display
7. Verify connection status shows "🟢 Connected"
8. Verify no console errors

## Common Issues and Solutions

### Issue 1: "joinSocketRoom is not a function"

**Cause**: Mock file not in correct location or not exported correctly

**Solution**:
```bash
# Verify mock file exists
ls frontend/src/services/__mocks__/socketService.js

# Verify export
grep "export const joinSocketRoom" frontend/src/services/__mocks__/socketService.js
```

### Issue 2: "Unable to find elements, DOM is empty"

**Cause**: Component not rendering due to missing props or uncaught errors

**Solution**:
- Check console for React errors
- Verify all required props are provided
- Use `waitFor` for async operations
- Add debug output to see actual rendered HTML

### Issue 3: "Cannot read properties of undefined"

**Cause**: Component trying to access properties of undefined pollState

**Solution**:
- Ensure PollControls PropTypes allows optional pollState
- Verify component uses optional chaining (`pollState?.toUpperCase()`)
- Check parent component provides valid pollState or undefined

### Issue 4: PropTypes Warning in Console

**Cause**: PropTypes marks pollState as required but component receives undefined

**Solution**:
Change line 49 of `PollControls.jsx`:
```javascript
pollState: PropTypes.string,  // Remove .isRequired
```

## Success Checklist

After applying all fixes, verify:

- [ ] `npm test -- tests/integration/userFlows.test.js` passes all tests
- [ ] `npm test` (full suite) passes all tests
- [ ] No console errors during test execution
- [ ] No PropTypes warnings in test output
- [ ] Test coverage report shows maintained or improved coverage
- [ ] All 3 originally failing tests now pass:
  - [ ] Host Poll Control Flow test
  - [ ] Connection Status test
  - [ ] Any other previously failing test

## Next Steps

After all tests pass:

1. Run linting and formatting:
   ```bash
   cd frontend
   npm run lint
   npm run format
   ```

2. Commit changes:
   ```bash
   git add .
   git commit -m "fix: resolve failing integration tests

   - Update PollControls PropTypes to allow optional pollState
   - Add defensive null handling for undefined state
   - Verify socket service mock exports all required functions

   Fixes 3 failing tests in userFlows.test.js

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

3. Push and create PR:
   ```bash
   git push -u origin 006-fix-integration-tests
   gh pr create --title "Fix failing integration tests" --body "$(cat <<'EOF'
   ## Summary
   Fix 3 failing integration tests in frontend/tests/integration/userFlows.test.js

   ## Changes
   - Update PollControls PropTypes to allow optional pollState
   - Ensure defensive null handling for undefined state values
   - Verify socket service mock exports all required functions

   ## Test Results
   - All integration tests passing (8/8)
   - Full test suite passing
   - No console errors or warnings
   - Test coverage maintained

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

## Additional Resources

- Jest Documentation: https://jestjs.io/docs/getting-started
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Testing Best Practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
