# Research: Fix Failing Integration Tests

**Feature**: 006-fix-integration-tests
**Date**: 2025-11-10

## Overview

This document captures research findings for fixing 3 failing integration tests in `frontend/tests/integration/userFlows.test.js`. The failures are caused by:
1. Missing `joinSocketRoom` function in socket service mock
2. Component rendering issues causing empty DOM
3. Missing defensive null checks in PollControls component

## Research Questions Resolved

### Q1: What is the socket service mock missing?

**Decision**: Add `joinSocketRoom` export to `frontend/src/services/__mocks__/socketService.js`

**Rationale**:
- The real socket service (`frontend/src/services/socketService.js:59-61`) exports `joinSocketRoom` as a simple function that emits a 'join' event for the host
- The mock file already exists and has the function exported (line 2), but it may not be properly configured
- The integration test at `userFlows.test.js:209-248` creates a poll and tests host poll controls, which requires `joinSocketRoom` to be callable

**Implementation**:
- Verify `joinSocketRoom` is exported from the mock (already present in the mock file)
- The mock should be a jest.fn() that can be called without side effects
- No complex behavior needed - simple mock function is sufficient

**Alternatives considered**:
- Inline mock in test file: Rejected because centralized mocking in `__mocks__` directory is Jest best practice
- Skip the test: Rejected because this tests critical host functionality

### Q2: Why is the DOM rendering empty in component tests?

**Decision**: Investigate test setup and component initialization requirements

**Rationale**:
- The error "Unable to find elements, DOM is empty (found only <div />)" suggests React components aren't rendering
- Common causes:
  - Missing required props
  - Uncaught errors during render
  - Async rendering not awaited
  - Missing context providers (if components use Context API)

**Research Findings**:
- The HostDashboard component likely requires initial state setup
- The component may depend on React Router context (tests wrap in `<BrowserRouter>`)
- Poll creation flow may involve async state updates that need `waitFor`

**Implementation approach**:
- Add debug output to see what's actually rendering
- Check if components have required props with default values
- Ensure all async operations use `waitFor` from @testing-library/react
- Verify no errors are thrown during render (use React error boundaries in tests if needed)

**Alternatives considered**:
- Mock all child components: Rejected because integration tests should test real component interactions
- Simplify components: Rejected because components are production code, tests should adapt

### Q3: How should PollControls handle undefined pollState?

**Decision**: Add defensive null check in PollControls component before accessing `pollState.toUpperCase()`

**Rationale**:
- The error "Cannot read properties of undefined (reading 'toUpperCase')" at `PollControls.jsx:42` indicates `pollState` is undefined
- The PropTypes validation at line 49 declares `pollState` as required, but this only warns in development
- Production code should defensively handle missing or invalid props

**Implementation**:
- Already partially implemented: Line 42 uses optional chaining `pollState?.toUpperCase()`
- However, PropTypes still marks it as required, creating inconsistency
- Options:
  1. Make pollState optional in PropTypes and handle undefined throughout component
  2. Provide default value in parent component
  3. Add runtime validation that throws descriptive error if missing

**Best Practice**: Make pollState optional with safe defaults, since network/async state can be temporarily undefined

**Alternatives considered**:
- Keep required and fail fast: Rejected because React components should gracefully handle loading states
- Add loading spinner: Rejected as out of scope for this bug fix

## Best Practices Applied

### Jest Mock Best Practices
- Use `__mocks__` directory for automatic Jest module mocking
- Export all public API functions from mock to match real module interface
- Use `jest.fn()` for trackable function calls
- Reset mocks in `beforeEach` with `jest.clearAllMocks()`

### React Testing Library Best Practices
- Use `waitFor` for async operations
- Query by accessible labels (`getByLabelText`, `getByRole`) over test IDs
- Test user-facing behavior, not implementation details
- Wrap components in required providers (`BrowserRouter`, Context providers)

### Component Defensive Coding
- Use optional chaining (`?.`) for potentially undefined values
- Provide fallback values for display (`|| 'DEFAULT'`)
- Make props optional when they represent async/loading states
- Keep PropTypes in sync with actual usage

## Dependencies

**Existing Dependencies** (no new installations needed):
- Jest 30.x - Testing framework (already installed)
- @testing-library/react - React testing utilities (already installed)
- @testing-library/jest-dom - DOM matchers (already installed)
- prop-types - Runtime type checking (already installed per feature #005)

## Related Documentation

- Jest Manual Mocks: https://jestjs.io/docs/manual-mocks
- React Testing Library Async: https://testing-library.com/docs/dom-testing-library/api-async
- React PropTypes: https://reactjs.org/docs/typechecking-with-proptypes.html

## Summary

All research questions have been resolved with clear implementation paths:
1. Socket mock function already exists, likely a test setup issue
2. Component rendering requires proper async handling and state initialization
3. PollControls needs defensive coding for undefined pollState

No additional dependencies or complex architectural changes required. All fixes are localized to existing files.
