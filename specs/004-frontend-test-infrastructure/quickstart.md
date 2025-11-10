# Quickstart: Frontend Test Infrastructure

**Feature**: 004-frontend-test-infrastructure
**Date**: 2025-11-09
**Purpose**: Validate test infrastructure setup and verify all components work correctly

## Prerequisites

- Node.js 18+ LTS installed
- npm 8+ installed
- Repository cloned and on branch `004-frontend-test-infrastructure`
- Backend dependencies NOT required (frontend-only feature)

## Quick Validation

Run these commands in sequence to verify the infrastructure is working:

```bash
# Navigate to frontend
cd frontend

# Verify dependencies are installed
npm install

# Run tests (should pass)
npm test

# Run linting (should pass with 0 errors)
npm run lint

# Run formatting check (should pass)
npm run format:check

# Expected output: All commands exit with code 0
echo "✅ All checks passed!"
```

## Detailed Validation Steps

### Step 1: Verify Test Infrastructure

**Goal**: Confirm Jest is configured and can run tests

```bash
cd frontend

# Should show Jest version and configuration
npx jest --version

# Should show test files found
npx jest --listTests

# Should run tests and show coverage
npm test
```

**Expected Output**:
```
PASS  tests/contract/HostDashboard.test.js
  ✓ setPoll receives response directly (45ms)
  ✓ setPollState receives response.state (23ms)
  ✓ joinSocketRoom receives response.roomCode (31ms)

-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   85.71 |    83.33 |   87.50 |   85.71 |
-----------------------|---------|----------|---------|---------|

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        2.451s
```

**Success Criteria**:
- ✅ All tests pass
- ✅ Coverage report generated
- ✅ Exit code 0
- ✅ Coverage thresholds met (80%)

**Troubleshooting**:
- If "No tests found": Verify `tests/contract/HostDashboard.test.js` exists
- If tests fail: Check mock implementations match API contracts
- If coverage below threshold: Add more tests or adjust jest.config.js

---

### Step 2: Verify Linting

**Goal**: Confirm ESLint is configured and analyzes code correctly

```bash
cd frontend

# Should show ESLint version
npx eslint --version

# Should analyze source files
npm run lint
```

**Expected Output** (if code is clean):
```
✨ No linting errors found!
```

**Expected Output** (if errors exist):
```
/path/to/src/components/Example.jsx
  12:7  error  'useState' is not defined  no-undef

✖ 1 problem (1 error, 0 warnings)
```

**Success Criteria**:
- ✅ ESLint runs without crashing
- ✅ Reports errors if code has issues
- ✅ Exit code 0 if no errors, 1 if errors found

**Troubleshooting**:
- If "command not found": Run `npm install` to install eslint
- If unexpected errors: Verify `.eslintrc.js` exists and is valid
- To auto-fix: Run `npm run lint:fix`

---

### Step 3: Verify Formatting

**Goal**: Confirm Prettier is configured and can format code

```bash
cd frontend

# Should show Prettier version
npx prettier --version

# Should check formatting
npm run format:check

# If issues found, format code
npm run format
```

**Expected Output** (if formatted):
```
All matched files use Prettier code style!
```

**Expected Output** (if needs formatting):
```
Checking formatting...
[warn] src/components/Example.jsx
[warn] Code style issues found. Run npm run format to fix.
```

**Success Criteria**:
- ✅ Prettier runs without crashing
- ✅ Reports unformatted files if any exist
- ✅ `npm run format` successfully formats files

**Troubleshooting**:
- If "command not found": Run `npm install` to install prettier
- If syntax errors: Fix code syntax before formatting
- If conflicts with ESLint: Check eslint-config-prettier is installed

---

### Step 4: Verify Watch Mode (Interactive)

**Goal**: Confirm watch mode works for TDD workflow

```bash
cd frontend

# Start watch mode
npm run test:watch
```

**Interactive Test**:
1. Watch mode starts
2. Press `a` to run all tests
3. Edit a test file (add a comment)
4. Tests should automatically re-run
5. Press `q` to quit

**Expected Behavior**:
- ✅ Tests run automatically on file changes
- ✅ Clear feedback on which tests changed
- ✅ Fast re-run (< 5 seconds for typical change)

**Troubleshooting**:
- If tests don't re-run: Check file system watcher is working
- If too slow: Add more specific test file patterns
- If crashes: Check for syntax errors in test files

---

### Step 5: Verify Pre-commit Integration

**Goal**: Confirm git hooks prevent committing bad code

```bash
cd /path/to/repo/root

# Make a small change to frontend code
echo "// test" >> frontend/src/components/HostDashboard.jsx

# Stage the change
git add frontend/src/components/HostDashboard.jsx

# Attempt to commit (should run pre-commit hook)
git commit -m "test: verify pre-commit hook"
```

**Expected Output**:
```
> frontend lint
✨ No linting errors found!

> frontend format
frontend/src/components/HostDashboard.jsx 87ms

> frontend test
PASS tests/contract/HostDashboard.test.js
...

[004-frontend-test-infrastructure abc1234] test: verify pre-commit hook
 1 file changed, 1 insertion(+)
```

**Success Criteria**:
- ✅ Pre-commit hook runs automatically
- ✅ Lint, format, and tests all execute
- ✅ Commit succeeds if all checks pass
- ✅ Commit blocked if checks fail

**Troubleshooting**:
- If hook doesn't run: Verify `.husky/pre-commit` is executable
- If hook fails incorrectly: Check scripts run successfully individually
- To skip hook temporarily: `git commit --no-verify` (NOT recommended)

**Cleanup**:
```bash
# Remove test change
git reset HEAD~1
git checkout -- frontend/src/components/HostDashboard.jsx
```

---

### Step 6: Verify CI Configuration (Optional - P3)

**Goal**: Confirm CI pipeline runs frontend tests

**Prerequisites**: Feature #003 must be merged for CI to run

```bash
# Push branch to GitHub
git push origin 004-frontend-test-infrastructure

# Check GitHub Actions
# Navigate to: https://github.com/<org>/zephyr/actions

# Verify "Frontend Tests" job runs and passes
```

**Expected Behavior**:
- ✅ CI runs `npm run lint`
- ✅ CI runs `npm run test:ci`
- ✅ CI runs `npm run format:check`
- ✅ Coverage report uploaded
- ✅ All jobs pass with green checkmarks

**Troubleshooting**:
- If CI job not found: Verify `.github/workflows/test.yml` updated
- If jobs fail: Check CI logs for specific errors
- If coverage upload fails: Verify codecov token configured

---

## Performance Benchmarks

Verify each command meets performance targets:

```bash
cd frontend

# Test execution time
time npm test
# Target: < 30 seconds

# Linting time
time npm run lint
# Target: < 10 seconds

# Formatting time
time npm run format
# Target: < 5 seconds

# Watch mode re-run (after file change)
# Target: < 5 seconds
```

**Success Criteria**:
- ✅ All commands complete within target times
- ✅ Performance scales reasonably with codebase growth

**Troubleshooting**:
- If tests too slow: Check for `setTimeout` with long delays
- If linting too slow: Add file exclusions to `.eslintignore`
- If formatting too slow: Add exclusions to `.prettierignore`

---

## Feature Acceptance Test

**Goal**: Verify all user stories from spec.md are satisfied

### User Story 1: Developer Writes Tests ✅

```bash
cd frontend

# Can run tests
npm test
# ✅ Tests execute and show results

# Can test API responses
cat tests/contract/HostDashboard.test.js
# ✅ Contract tests verify response handling

# Tests run quickly
time npm test
# ✅ Complete in < 30 seconds

# Can use watch mode
npm run test:watch
# ✅ Watch mode works for TDD workflow
```

---

### User Story 2: Developer Ensures Code Quality ✅

```bash
cd frontend

# Can run linting
npm run lint
# ✅ Linting provides feedback on issues

# Can format code
npm run format
# ✅ Code automatically formatted

# Pre-commit enforces quality
git commit -am "test"
# ✅ Quality checks run before commit

# Existing code passes
npm run lint
# ✅ Zero errors on existing code
```

---

### User Story 3: Retrospective Tests for Bug #003 ✅

```bash
cd frontend

# Retrospective tests exist
cat tests/contract/HostDashboard.test.js
# ✅ File contains tests for setPoll, setPollState, joinSocketRoom

# Tests pass
npm test -- tests/contract/HostDashboard.test.js
# ✅ All retrospective tests pass

# Tests prevent regression
# (Manually verify test would fail if bug re-introduced)
```

---

### User Story 4: CI/CD Validation (P3) ✅

```bash
# CI runs frontend tests
# Check GitHub Actions workflow
# ✅ Frontend test job exists and runs

# CI blocks failing merges
# (Manually verify by pushing failing tests)
# ✅ PR blocked if tests/lint/format fail
```

---

## Common Issues and Solutions

### Issue: "Cannot find module '@testing-library/react'"

**Cause**: Dev dependencies not installed

**Solution**:
```bash
cd frontend
npm install
```

---

### Issue: "No tests found"

**Cause**: Test files not in correct location

**Solution**:
```bash
# Verify test files exist
ls -la tests/contract/
ls -la tests/unit/

# Check Jest config
cat jest.config.js
# Ensure testMatch or testRegex includes test files
```

---

### Issue: "Linting errors on existing code"

**Cause**: Existing code doesn't meet linting standards

**Solution**:
```bash
# Auto-fix what can be fixed
npm run lint:fix

# Manually fix remaining issues
npm run lint
# Address each error shown
```

---

### Issue: "Coverage threshold not met"

**Cause**: Not enough test coverage

**Solution**:
```bash
# View coverage report
open coverage/lcov-report/index.html

# Identify uncovered lines
# Add tests to cover those lines

# OR temporarily lower threshold (not recommended)
# Edit jest.config.js coverageThreshold
```

---

### Issue: "Pre-commit hook too slow"

**Cause**: Running all tests on every commit

**Solution**:
```bash
# Use --findRelatedTests flag
# Updates .husky/pre-commit to:
npm test -- --bail --findRelatedTests

# Only runs tests related to staged files
```

---

## Post-Validation Checklist

After running all validation steps, verify:

- [ ] `npm test` runs and passes
- [ ] `npm run lint` runs with 0 errors
- [ ] `npm run format` runs without errors
- [ ] `npm run test:watch` enters watch mode successfully
- [ ] Pre-commit hook prevents bad commits
- [ ] Coverage report shows >= 80% for all metrics
- [ ] Retrospective tests for #003 bug all pass
- [ ] CI pipeline runs frontend tests (if P3 complete)

---

## Next Steps

**After validation succeeds**:

1. ✅ Mark User Story 1 (P1) complete
2. ✅ Mark User Story 2 (P1) complete
3. ✅ Mark User Story 3 (P2) complete
4. ⏭️ Proceed to User Story 4 (P3 - CI integration) if not done
5. ✅ Create pull request to merge infrastructure
6. ✅ Update CLAUDE.md with frontend testing commands

**For future development**:

- Write tests BEFORE implementation (TDD)
- Run `npm run test:watch` during development
- Ensure all tests pass before committing
- Monitor coverage reports to maintain quality

---

## Automated Quickstart Script

For automated validation, save this as `quickstart.sh`:

```bash
#!/bin/bash
set -e  # Exit on any error

echo "🚀 Frontend Test Infrastructure Quickstart"
echo "=========================================="
echo ""

cd frontend

echo "📦 Step 1: Install dependencies"
npm install
echo "✅ Dependencies installed"
echo ""

echo "🧪 Step 2: Run tests"
npm test
echo "✅ Tests passed"
echo ""

echo "🔍 Step 3: Run linting"
npm run lint
echo "✅ Linting passed"
echo ""

echo "💅 Step 4: Check formatting"
npm run format:check
echo "✅ Formatting verified"
echo ""

echo "⚡ Step 5: Performance benchmarks"
echo "   - Testing..."
time npm test | tail -n 1
echo "   - Linting..."
time npm run lint | tail -n 1
echo "   - Formatting..."
time npm run format | tail -n 1
echo ""

echo "✨ All validation steps passed!"
echo "Infrastructure is ready for development."
echo ""
echo "Next steps:"
echo "  - Try 'npm run test:watch' for TDD workflow"
echo "  - Run 'npm test' before each commit"
echo "  - Check coverage report in coverage/lcov-report/index.html"
```

**Usage**:
```bash
chmod +x specs/004-frontend-test-infrastructure/quickstart.sh
./specs/004-frontend-test-infrastructure/quickstart.sh
```

---

## Documentation

**Related Files**:
- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [research.md](./research.md) - Technology decisions
- [data-model.md](./data-model.md) - Configuration entities
- [contracts/npm-scripts.md](./contracts/npm-scripts.md) - Script interface contracts

**Project Documentation**:
- [CLAUDE.md](/CLAUDE.md) - Updated with frontend testing commands
- Backend [quickstart.md](/specs/002-production-ready/quickstart.md) - Similar pattern for backend
