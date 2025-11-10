# Quickstart: Fix Linting Errors

**Feature**: 005-fix-linting-errors
**Branch**: `005-fix-linting-errors`
**Date**: 2025-11-10

## Validation Steps

This quickstart provides step-by-step validation to verify all 39 linting errors are resolved.

### Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 005-fix-linting-errors

# Navigate to frontend directory
cd frontend

# Install dependencies (including prop-types)
npm install
```

### Step 1: Verify Linting Passes

```bash
# Run ESLint - should show 0 errors, 0 warnings
npm run lint

# Expected output:
# ✨ Done in X.XXs (no errors reported)
```

**Success Criteria**: Exit code 0, no error messages

### Step 2: Verify All Tests Pass

```bash
# Run complete test suite
npm test

# Expected output:
# Test Suites: X passed, X total
# Tests: X passed, X total
# Coverage: Should maintain or improve existing coverage
```

**Success Criteria**: All tests pass, no new failures introduced

### Step 3: Verify PropTypes Validation

```bash
# Start development server
npm run dev

# In browser console (F12), verify:
# - No PropTypes warnings appear
# - Components render without errors
```

**Manual Testing**:
1. Navigate to Host Dashboard - create a poll
2. Navigate to Join Page - join the poll
3. Navigate to Vote Page - submit a vote
4. Check browser console for PropTypes warnings

**Success Criteria**: No PropTypes warnings in console

### Step 4: Verify Accessibility

```bash
# Open browser DevTools
# Navigate to: Lighthouse > Accessibility audit
# Or install: axe DevTools extension
```

**Manual Testing with Screen Reader** (optional but recommended):
1. Open JoinPage with screen reader (NVDA/JAWS/VoiceOver)
2. Tab through form fields
3. Verify each input is announced with its label

**Success Criteria**:
- No jsx-a11y/label-has-associated-control errors in ESLint
- Form inputs are keyboard navigable with proper announcements

### Step 5: Verify Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# In production build browser console:
# - No console.log output should appear
# - Application should function normally
```

**Success Criteria**: Production build succeeds, no console output

### Step 6: Run Format Check

```bash
# Verify code formatting
npm run format:check

# If any issues, auto-fix with:
npm run format
```

**Success Criteria**: All files properly formatted

## Expected Changes Summary

### Files Modified (8 total)

1. **frontend/package.json**: `prop-types` added to dependencies
2. **frontend/src/components/ParticipantCounter.jsx**: PropTypes added
3. **frontend/src/components/PollControls.jsx**: PropTypes added, button type fixed
4. **frontend/src/components/PollResults.jsx**: PropTypes added, array keys fixed
5. **frontend/src/pages/HostDashboard.jsx**: Labels fixed, keys fixed, console removed, imports cleaned, loop refactored
6. **frontend/src/pages/JoinPage.jsx**: Labels fixed, entity escaped
7. **frontend/src/pages/VotePage.jsx**: Array keys fixed, imports cleaned
8. **frontend/src/services/socketService.js**: Console removed, line length fixed

### Error Resolution Breakdown

- ✅ PropTypes errors: 13 → 0
- ✅ Accessibility errors: 4 → 0
- ✅ Array key errors: 3 → 0
- ✅ Console warnings: 15 → 0
- ✅ Miscellaneous: 6 → 0

**Total**: 39 → 0

## Troubleshooting

### Issue: PropTypes warnings appear after adding validation

**Cause**: Component is being called with missing or incorrect props

**Solution**:
1. Check component usage in parent components
2. Add missing props or provide default values
3. Update PropTypes if type expectations were incorrect

### Issue: Tests fail after accessibility changes

**Cause**: Tests may be querying by label text that changed

**Solution**:
1. Update test queries to match new label structure
2. Use `getByLabelText()` instead of `getByText()` where appropriate

### Issue: Array key warnings persist

**Cause**: Options may have duplicate values or keys aren't truly unique

**Solution**:
1. Verify poll options are unique within each poll
2. Consider adding unique IDs to options if text can be duplicate

## Next Steps

After validation passes:

1. Review git diff to confirm only intended changes
2. Run `/speckit.tasks` to generate implementation tasks
3. Create pull request with title: "Fix 39 ESLint errors in frontend"
4. Link to GitHub issue #17

## References

- GitHub Issue: #17
- Feature Spec: [spec.md](spec.md)
- Implementation Plan: [plan.md](plan.md)
- Research: [research.md](research.md)
