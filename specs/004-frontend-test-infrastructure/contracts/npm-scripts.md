# Contract: Frontend NPM Scripts

**Feature**: 004-frontend-test-infrastructure
**Date**: 2025-11-09
**Type**: CLI Interface Contract

## Overview

This contract defines the npm script interface for frontend testing, linting, and formatting. These scripts are the primary interface developers use to interact with the test infrastructure.

## Testing Scripts

### `npm test`

**Purpose**: Run all tests with coverage reporting

**Command**: `jest --coverage`

**Input**: None (runs all tests matching `**/*.test.js` or `**/*.spec.js`)

**Output**:
```
PASS  tests/contract/HostDashboard.test.js
  ✓ setPoll receives response directly (45ms)
  ✓ setPollState receives response.state (23ms)
  ✓ joinSocketRoom receives response.roomCode (31ms)

-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   85.71 |    83.33 |   87.50 |   85.71 |
 HostDashboard.jsx     |   85.71 |    83.33 |   87.50 |   85.71 |
-----------------------|---------|----------|---------|---------|

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        2.451s
```

**Exit Codes**:
- `0`: All tests passed, coverage thresholds met
- `1`: Tests failed OR coverage thresholds not met

**Side Effects**:
- Generates `coverage/` directory with HTML, LCOV, and JSON reports
- May update snapshots if `--updateSnapshot` flag used

**Performance Target**: < 30 seconds for initial test suite

---

### `npm run test:watch`

**Purpose**: Run tests in watch mode for active development

**Command**: `jest --watch`

**Input**: Interactive (responds to keypress commands)

**Interactive Commands**:
- `a`: Run all tests
- `f`: Run only failed tests
- `p`: Filter by filename pattern
- `t`: Filter by test name pattern
- `q`: Quit watch mode
- `Enter`: Trigger test run

**Output**: Same as `npm test` but continuously updating

**Exit Codes**:
- Never exits until user quits (q)

**Side Effects**:
- Does NOT generate coverage report (performance optimization)
- Watches for file changes and re-runs affected tests

**Performance**: Tests re-run < 5 seconds for typical changes

---

### `npm run test:ci`

**Purpose**: Run tests optimized for CI environment

**Command**: `jest --coverage --ci --maxWorkers=2`

**Input**: None

**Output**: Same as `npm test` but with CI-specific settings

**Differences from `npm test`**:
- `--ci`: Disables watch mode, fails on updateSnapshot
- `--maxWorkers=2`: Limits parallelism to avoid CI resource exhaustion

**Exit Codes**: Same as `npm test`

**Performance Target**: Similar to `npm test`, but more predictable in CI

---

## Linting Scripts

### `npm run lint`

**Purpose**: Analyze code for quality issues and style violations

**Command**: `eslint src --ext .js,.jsx --report-unused-disable-directives --max-warnings 0`

**Input**: All `.js` and `.jsx` files in `src/` directory

**Output**:
```
/path/to/src/components/Example.jsx
  12:7   error  'useState' is not defined  no-undef
  24:15  error  Missing dependency: 'data'  react-hooks/exhaustive-deps

✖ 2 problems (2 errors, 0 warnings)
```

**Exit Codes**:
- `0`: No errors or warnings
- `1`: Errors found (or warnings found due to --max-warnings 0)

**Side Effects**: None (read-only analysis)

**Flags**:
- `--ext .js,.jsx`: Check both JS and JSX files
- `--report-unused-disable-directives`: Warn about unnecessary eslint-disable comments
- `--max-warnings 0`: Treat warnings as errors

**Performance Target**: < 10 seconds for typical codebase

---

### `npm run lint:fix`

**Purpose**: Automatically fix linting issues where possible

**Command**: `eslint src --ext .js,.jsx --fix`

**Input**: Same as `npm run lint`

**Output**: Same as `npm run lint`, but only shows unfixable issues

**Exit Codes**: Same as `npm run lint`

**Side Effects**: **MODIFIES FILES** - Auto-fixes issues like:
- Missing semicolons
- Incorrect indentation
- Unused imports (removed)
- Fixable React Hooks violations

**Warning**: Does NOT auto-fix all issues (some require manual intervention)

---

## Formatting Scripts

### `npm run format`

**Purpose**: Automatically format all code to match Prettier config

**Command**: `prettier --write 'src/**/*.{js,jsx,css}'`

**Input**: All JS, JSX, and CSS files in `src/` directory

**Output**:
```
src/components/Example.jsx 123ms
src/components/HostDashboard.jsx 87ms
src/styles/App.css 45ms
```

**Exit Codes**:
- `0`: All files formatted successfully
- `1`: Syntax errors prevent formatting

**Side Effects**: **MODIFIES FILES** - Reformats code according to .prettierrc

**Changes Applied**:
- Consistent indentation (tabs vs spaces)
- Quote style (single vs double)
- Semicolon usage
- Line length wrapping
- Trailing commas

**Performance Target**: < 5 seconds for typical codebase

---

### `npm run format:check`

**Purpose**: Verify code is formatted without modifying files (CI use)

**Command**: `prettier --check 'src/**/*.{js,jsx,css}'`

**Input**: Same as `npm run format`

**Output**:
```
Checking formatting...
src/components/Example.jsx
Code style issues found. Run `npm run format` to fix.
```

**Exit Codes**:
- `0`: All files already formatted correctly
- `1`: Files need formatting

**Side Effects**: None (read-only check)

**CI Usage**: Used in CI to fail builds with unformatted code

---

## Contract Validation

### Script Naming Convention

**Contract**: Scripts follow standard npm naming patterns

**Requirements**:
- Base command: `npm test`, `npm run lint`, `npm run format`
- Variants use colon suffix: `test:watch`, `test:ci`, `lint:fix`, `format:check`
- No custom aliases (maintains consistency across projects)

### Exit Code Contract

**Contract**: All scripts use standard exit codes

**Requirements**:
- `0` = Success
- `1` = Failure
- Never exit with other codes

**Rationale**: Allows chaining with `&&` and use in CI pipelines

### Performance Contract

**Contract**: Scripts meet performance targets

**Thresholds**:
- `npm test`: < 30s (initial suite)
- `npm run lint`: < 10s
- `npm run format`: < 5s
- `npm run test:watch`: < 5s (re-run on change)

**Enforcement**: Document in spec.md success criteria

### Output Format Contract

**Contract**: Scripts produce parseable output

**Requirements**:
- Test output includes pass/fail summary
- Coverage output includes percentage table
- Lint output includes file:line:column format
- Format output lists modified files

**Rationale**: Enables IDE integration and CI parsing

## Integration Contracts

### Pre-commit Hook Integration

**Contract**: Scripts work with git pre-commit hooks

**Requirements**:
- Must support running on subset of files (--findRelatedTests for tests)
- Must exit quickly on no changes
- Must provide actionable error messages

**Usage Pattern**:
```bash
# In .husky/pre-commit
cd frontend && \
  npm run lint && \
  npm run format && \
  npm test -- --bail --findRelatedTests
```

### CI Pipeline Integration

**Contract**: Scripts work in CI environment

**Requirements**:
- Must not require TTY (no interactive prompts)
- Must use CI-specific flags (--ci for Jest)
- Must limit resource usage (--maxWorkers)
- Must produce artifacts (coverage reports)

**Usage Pattern**:
```yaml
# In .github/workflows/test.yml
- name: Run tests
  run: cd frontend && npm run test:ci
- name: Check formatting
  run: cd frontend && npm run format:check
```

## Error Handling Contract

### Common Errors and Messages

**Error**: No test files found
```
No tests found, exiting with code 1
Run with `--passWithNoTests` to exit with code 0 in this case.
```
**Resolution**: Add at least one test file

---

**Error**: Coverage threshold not met
```
FAIL Coverage for lines (75%) does not meet global threshold (80%)
```
**Resolution**: Add more tests or adjust threshold

---

**Error**: Linting errors found
```
✖ 5 problems (3 errors, 2 warnings)
  2 errors and 0 warnings potentially fixable with the `--fix` option.
```
**Resolution**: Run `npm run lint:fix` or fix manually

---

**Error**: Unformatted code detected
```
Code style issues found in the above file(s). Forgot to run Prettier?
```
**Resolution**: Run `npm run format`

---

## Backward Compatibility

**Contract**: Script interface remains stable

**Guarantees**:
- Script names will not change (breaking change)
- Exit codes will not change meaning
- Output format may evolve (parsers should be lenient)

**Deprecation Policy**:
- If script needs removal, mark deprecated for 1 release cycle
- Provide alternative script in deprecation message

## Testing the Contract

### Manual Validation

**After infrastructure setup**, verify each script works:

```bash
cd frontend

# Test scripts
npm test          # Should run tests and show coverage
npm run test:watch # Should enter watch mode
npm run test:ci   # Should run with CI flags

# Lint scripts
npm run lint      # Should analyze code
npm run lint:fix  # Should fix auto-fixable issues

# Format scripts
npm run format    # Should reformat files
npm run format:check # Should verify formatting
```

### Automated Validation

**In CI**, verify scripts in quickstart.md:

```bash
# Run quickstart validation
./specs/004-frontend-test-infrastructure/quickstart.md
```

Should execute all scripts and verify exit codes.

## Notes

- Scripts defined in `frontend/package.json`
- Configuration files: `jest.config.js`, `.eslintrc.js`, `.prettierrc`
- Scripts are the public API - config files are implementation details
- Developers should rarely need to modify Jest/ESLint/Prettier configs directly
