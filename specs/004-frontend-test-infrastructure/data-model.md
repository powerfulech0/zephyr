# Data Model: Frontend Test Infrastructure

**Feature**: 004-frontend-test-infrastructure
**Date**: 2025-11-09
**Phase**: 1 (Design)

## Overview

This is an infrastructure feature that establishes testing and code quality tooling for the frontend. Unlike user-facing features, there are no traditional data entities (polls, users, votes). Instead, this document models the **configuration entities** and **test artifacts** that the infrastructure creates and manages.

## Configuration Entities

### Jest Configuration

**File**: `frontend/jest.config.js`

**Purpose**: Defines test runner behavior, environment, and coverage settings

**Schema**:
```javascript
{
  testEnvironment: String,           // 'jsdom' for React DOM testing
  setupFilesAfterEnv: Array<String>, // ['<rootDir>/tests/setup.js']
  moduleNameMapper: Object,          // Maps CSS/assets to mocks
  collectCoverageFrom: Array<String>, // Files to include in coverage
  coverageThreshold: {                // Minimum coverage requirements
    global: {
      branches: Number,    // 80
      functions: Number,   // 80
      lines: Number,       // 80
      statements: Number   // 80
    }
  }
}
```

**Relationships**:
- References `tests/setup.js` for environment setup
- Defines which source files generate coverage reports
- Enforces quality gates via coverage thresholds

**Validation Rules**:
- testEnvironment must be 'jsdom' for React testing
- Coverage thresholds must be >= 0 and <= 100
- setupFilesAfterEnv paths must exist
- collectCoverageFrom patterns must match existing files

### ESLint Configuration

**File**: `frontend/.eslintrc.js` (EXISTING - not created by this feature)

**Purpose**: Defines code quality rules and linting behavior

**Schema** (documented for reference, not modified):
```javascript
{
  extends: Array<String>,      // Base configurations (e.g., 'eslint:recommended')
  plugins: Array<String>,      // Plugins (e.g., 'react', 'react-hooks')
  rules: Object,               // Specific rule configurations
  env: Object,                 // Environment (browser, es6, node)
  parserOptions: Object        // Parser settings (ecmaVersion, sourceType)
}
```

**Activation Method**: npm script in package.json
```json
{
  "lint": "eslint src --ext .js,.jsx --report-unused-disable-directives --max-warnings 0"
}
```

### Prettier Configuration

**File**: `frontend/.prettierrc` (EXISTING - not created by this feature)

**Purpose**: Defines code formatting rules

**Schema** (documented for reference, not modified):
```json
{
  "semi": Boolean,           // Add semicolons
  "singleQuote": Boolean,    // Use single quotes
  "tabWidth": Number,        // Spaces per indentation level
  "trailingComma": String,   // "es5" | "none" | "all"
  "printWidth": Number       // Line width before wrapping
}
```

**Activation Method**: npm script in package.json
```json
{
  "format": "prettier --write 'src/**/*.{js,jsx,css}'",
  "format:check": "prettier --check 'src/**/*.{js,jsx,css}'"
}
```

## Test Artifacts

### Test File

**Location**: `frontend/tests/contract/*.test.js` or `frontend/tests/unit/*.test.js`

**Purpose**: Contains test cases that validate component or API contract behavior

**Structure**:
```javascript
{
  imports: [
    "Test utilities (@testing-library/react)",
    "Component under test",
    "Mock dependencies"
  ],
  mocks: [
    "API module mocks",
    "Browser API mocks (if needed)"
  ],
  testCases: [
    {
      description: String,        // Test description
      setup: Function,            // Arrange: Create mocks, render component
      action: Function,           // Act: User interaction or state change
      assertion: Function         // Assert: Verify expected outcome
    }
  ]
}
```

**Example** (HostDashboard.test.js):
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HostDashboard from '../../src/components/HostDashboard';
import * as api from '../../src/services/api';

// Mock setup
jest.mock('../../src/services/api');

describe('HostDashboard API Response Handling', () => {
  test('setPoll receives response directly (not response.data)', async () => {
    // Arrange
    const mockPoll = { id: '123', title: 'Test', state: 'closed', roomCode: 'ABC' };
    api.createPoll.mockResolvedValue(mockPoll);

    render(<HostDashboard />);

    // Act
    const createButton = screen.getByRole('button', { name: /create poll/i });
    await userEvent.click(createButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Test/i)).toBeInTheDocument();
      expect(screen.getByText(/ABC/i)).toBeInTheDocument();
    });
  });
});
```

**Validation Rules**:
- Test files must end with `.test.js` or `.spec.js`
- Each test must have clear Arrange-Act-Assert structure
- Tests must be independent (no shared state between tests)
- Async tests must use async/await or return promises

### Test Setup File

**File**: `frontend/tests/setup.js`

**Purpose**: Configures global test environment before all tests run

**Schema**:
```javascript
{
  imports: [
    "@testing-library/jest-dom" // Custom matchers
  ],
  globalMocks: Object,     // Browser APIs not in jsdom
  globalConfig: Object     // Test timeouts, etc.
}
```

**Example**:
```javascript
import '@testing-library/jest-dom';

// Mock IntersectionObserver if components use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return []; }
};

// Mock matchMedia if components use responsive design
global.matchMedia = global.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};
```

### Coverage Report

**Generated By**: Jest during test execution

**Output Locations**:
- Terminal: Text summary with percentages
- File: `coverage/` directory (HTML, LCOV, JSON formats)

**Schema**:
```javascript
{
  summary: {
    lines: { total: Number, covered: Number, percentage: Number },
    statements: { total: Number, covered: Number, percentage: Number },
    functions: { total: Number, covered: Number, percentage: Number },
    branches: { total: Number, covered: Number, percentage: Number }
  },
  files: [
    {
      path: String,
      lines: { /* same as summary */ },
      statements: { /* same as summary */ },
      functions: { /* same as summary */ },
      branches: { /* same as summary */ },
      uncoveredLines: Array<Number>
    }
  ]
}
```

**Validation**:
- Thresholds defined in jest.config.js must be met
- Report must show >0% coverage (indicates tests ran)
- Files excluded via collectCoverageFrom should not appear

## Package.json Scripts

**File**: `frontend/package.json` (MODIFIED by this feature)

**Purpose**: Defines npm commands for testing, linting, and formatting

**Schema** (scripts section only):
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --coverage --ci --maxWorkers=2",
    "lint": "eslint src --ext .js,.jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext .js,.jsx --fix",
    "format": "prettier --write 'src/**/*.{js,jsx,css}'",
    "format:check": "prettier --check 'src/**/*.{js,jsx,css}'"
  }
}
```

**Relationships**:
- `test` invokes Jest with coverage
- `lint` invokes ESLint on src directory
- `format` invokes Prettier on src files
- CI-specific variants optimize for pipeline execution

## Pre-commit Hook Configuration

**File**: `.husky/pre-commit` (MODIFIED by this feature - if frontend checks don't exist)

**Purpose**: Runs quality checks before allowing git commit

**Schema**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Backend checks (existing)
cd backend && npm run lint && npm test

# Frontend checks (NEW - added by this feature)
cd ../frontend && npm run lint && npm run format && npm test -- --bail --findRelatedTests
```

**Alternative** (if lint-staged is used):
```javascript
// .lintstagedrc.js or package.json lint-staged config
{
  "frontend/src/**/*.{js,jsx}": [
    "eslint --fix",
    "prettier --write",
    "jest --bail --findRelatedTests"
  ]
}
```

**Validation Rules**:
- Hook must exit non-zero on any failure (prevents commit)
- Hook should run only on staged files (performance)
- Hook must provide clear error messages when checks fail

## CI/CD Configuration (Phase 3)

**File**: `.github/workflows/test.yml` (MODIFIED by this feature)

**Purpose**: Runs frontend tests in GitHub Actions CI pipeline

**Schema Addition**:
```yaml
jobs:
  # Existing backend jobs...

  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run linting
        run: cd frontend && npm run lint

      - name: Run tests
        run: cd frontend && npm run test:ci

      - name: Check formatting
        run: cd frontend && npm run format:check

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: success()
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
```

## Entity Relationships

```
jest.config.js
    ├── references → tests/setup.js
    ├── defines coverage for → src/**/*.{js,jsx}
    └── enforces thresholds → Coverage Report

tests/setup.js
    └── imports → @testing-library/jest-dom

Test Files (*.test.js)
    ├── import → Components under test
    ├── import → Test utilities
    ├── mock → API modules
    └── generate → Coverage Report

package.json scripts
    ├── invoke → Jest (test commands)
    ├── invoke → ESLint (lint commands)
    └── invoke → Prettier (format commands)

Pre-commit Hook
    ├── executes → npm run lint
    ├── executes → npm run format
    └── executes → npm test (with flags)

CI Pipeline
    ├── executes → npm run lint
    ├── executes → npm run test:ci
    ├── executes → npm run format:check
    └── uploads → Coverage Report
```

## State Transitions

### Test Execution Lifecycle

```
[Not Run]
    → npm test
    → [Running]
        → Test passes → [Passed]
        → Test fails → [Failed]
        → Coverage threshold not met → [Failed - Coverage]

[Passed]
    → Code changes
    → [Not Run] (or auto-run in watch mode)
```

### Quality Check Lifecycle (Pre-commit)

```
[Uncommitted Changes]
    → git commit
    → [Running Checks]
        → All pass → [Committed]
        → Lint fails → [Blocked - Lint Error]
        → Format fails → [Blocked - Format Error]
        → Tests fail → [Blocked - Test Failure]

[Blocked - *]
    → Fix issues
    → [Uncommitted Changes] (retry commit)
```

## Validation Constraints

### Jest Configuration Constraints
- `testEnvironment` must be 'jsdom' for React
- `setupFilesAfterEnv` paths must exist as files
- `coverageThreshold.global.*` must be 0-100
- `collectCoverageFrom` must exclude test files

### Test File Constraints
- Must import necessary test utilities
- Must clean up after each test (automatic with @testing-library)
- Async tests must resolve (no hanging promises)
- No test interdependencies (order-independent)

### Package.json Scripts Constraints
- Script names must follow convention (test, lint, format)
- Commands must reference valid binaries (jest, eslint, prettier)
- CI variants must use --ci flag for Jest

### Pre-commit Hook Constraints
- Must be executable (chmod +x)
- Must exit non-zero on failure
- Should run quickly (<30s for reasonable changesets)

## Notes

- **No user-facing data**: This feature creates developer tooling, not user features
- **Configuration-driven**: Behavior defined by config files, not code
- **Idempotent**: Running npm test multiple times produces consistent results
- **No persistence**: Test results and coverage are ephemeral (regenerated each run)
- **Side-effect free**: Tests should not modify files or global state

## Future Enhancements

Not in scope for this feature, but documented for future reference:

1. **Performance Test Entities**: Could track test execution time over commits
2. **Coverage Trend Entities**: Could store historical coverage data
3. **Mutation Testing**: Could add mutation testing configuration (e.g., Stryker)
4. **Visual Regression Entities**: Could add screenshot comparisons (e.g., Percy, Chromatic)
5. **Accessibility Test Entities**: Could add axe-core or jest-axe configuration
