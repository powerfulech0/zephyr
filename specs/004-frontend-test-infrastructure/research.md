# Research: Frontend Test Infrastructure and Quality Tooling

**Feature**: 004-frontend-test-infrastructure
**Date**: 2025-11-09
**Phase**: 0 (Research & Decision Making)

## Overview

This document captures research findings and decisions for establishing frontend test infrastructure and code quality tooling. Since this is an infrastructure feature using well-established tools, research focuses on configuration best practices and integration patterns rather than technology selection.

## Technology Decisions

### Testing Framework: Jest

**Decision**: Use Jest 30.x as the test runner for frontend

**Rationale**:
- Industry standard for React testing with excellent React ecosystem support
- Mature, battle-tested framework with comprehensive documentation
- Built-in code coverage reporting
- Parallel test execution for performance
- Watch mode for development workflow
- Excellent error messages and debugging support
- Large community and extensive plugin ecosystem

**Alternatives Considered**:
- **Vitest**: Modern alternative with native Vite integration
  - **Why rejected**: While Vitest is faster and has better Vite integration, Jest is more mature with better React Testing Library documentation and examples. Given this is establishing infrastructure from scratch, Jest's stability and extensive documentation outweigh Vitest's speed benefits.

**Configuration Approach**:
- Use ES module syntax (export default) to match Vite configuration style
- Set testEnvironment to 'jsdom' for React DOM testing
- Configure module name mapper for CSS/asset mocking
- Set coverage thresholds at 80% for all metrics
- Exclude main.jsx from coverage (application entry point)

### React Testing Library

**Decision**: Use @testing-library/react and @testing-library/jest-dom

**Rationale**:
- Recommended by React team for component testing
- Encourages testing from user perspective (accessibility-focused queries)
- Excellent support for React 18 features (concurrent rendering, automatic batching)
- @testing-library/jest-dom provides custom matchers for DOM assertions
- Integrates seamlessly with Jest

**Best Practices Applied**:
- Use screen queries instead of destructuring from render()
- Prefer accessible queries (getByRole, getByLabelText) over test IDs
- Use userEvent for simulating user interactions (more realistic than fireEvent)
- Test component behavior, not implementation details

### CSS and Asset Mocking

**Decision**: Use identity-obj-proxy for CSS module mocking

**Rationale**:
- Standard solution for mocking CSS imports in Jest
- Returns className as-is, enabling snapshot testing
- Lightweight with no additional dependencies
- Works with CSS modules, regular CSS, and preprocessors (Sass, Less)

**Configuration**:
```javascript
moduleNameMapper: {
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
}
```

### Linting: ESLint

**Decision**: Activate existing ESLint configuration via npm scripts

**Rationale**:
- ESLint configuration already exists in frontend/.eslintrc.js
- No need to modify rules - just activate via package.json scripts
- Maintains consistency with backend linting approach
- Existing config likely includes React-specific rules (eslint-plugin-react, eslint-plugin-react-hooks)

**Best Practices**:
- Run with --report-unused-disable-directives to catch unnecessary disable comments
- Set --max-warnings 0 to treat warnings as errors in CI
- Use --ext .js,.jsx to lint both JS and JSX files

### Formatting: Prettier

**Decision**: Activate existing Prettier configuration via npm scripts

**Rationale**:
- Prettier configuration already exists in frontend/.prettierrc
- Backend uses Prettier - frontend should match for consistency
- Prettier is opinionated and requires minimal configuration
- Automatic formatting reduces bike-shedding in code reviews

**Integration**:
- Separate npm scripts for formatting (--write) and checking (--check)
- Pre-commit hook runs format automatically
- CI runs format:check to verify formatting without modifying files

### Pre-commit Integration: Husky + lint-staged

**Decision**: Integrate frontend checks into existing Husky pre-commit hooks

**Rationale**:
- Husky is already configured for backend (feature #002)
- lint-staged allows running commands only on staged files (faster)
- Prevents committing code that fails quality checks
- Educates developers about quality issues immediately

**Configuration Approach**:
Add to .husky/pre-commit or lint-staged config:
```bash
# Frontend quality checks
cd frontend && npm run lint
cd frontend && npm run format
cd frontend && npm test -- --bail --findRelatedTests
```

## Best Practices Research

### Jest Configuration Best Practices

**Test Environment Setup** (tests/setup.js):
- Import @testing-library/jest-dom for custom matchers
- Configure global test utilities if needed
- Set up mocks for browser APIs not available in jsdom (e.g., IntersectionObserver, matchMedia)

**Coverage Thresholds**:
- Start with 80% across all metrics (branches, functions, lines, statements)
- Threshold enforces minimum quality but allows flexibility for edge cases
- Can be raised incrementally as test coverage improves

**Collect Coverage From**:
- Include all src/**/*.{js,jsx} files
- Exclude entry points (main.jsx) - no testable logic
- Exclude test files themselves (automatic via Jest)

### Contract Testing Best Practices

**Pattern**: Test component behavior with API responses, not API implementation

**Approach for HostDashboard Tests**:
1. Mock fetch or axios at the module level
2. Return test response data that matches API contract
3. Render component and verify state updates
4. Assert component properly handles response structure

**Example Structure**:
```javascript
// frontend/tests/contract/HostDashboard.test.js
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HostDashboard from '../../src/components/HostDashboard';

// Mock API module
jest.mock('../../src/services/api', () => ({
  createPoll: jest.fn(),
}));

test('setPoll receives API response directly (not response.data)', async () => {
  const mockResponse = { id: '123', title: 'Test Poll', state: 'closed' };
  api.createPoll.mockResolvedValue(mockResponse);

  render(<HostDashboard />);
  // ... test implementation
});
```

### Watch Mode Best Practices

**Configuration**:
- Use --watch flag for local development
- Configure to run tests related to changed files only
- Provide clear key bindings (press 'a' for all tests, 'f' for failed tests)

**Developer Workflow**:
1. Start watch mode: `npm run test:watch`
2. Edit component or test file
3. Jest automatically reruns affected tests
4. Fix failures and iterate

### Performance Optimization

**Target**: Test suite under 30 seconds

**Strategies**:
- Run tests in parallel (Jest default with --maxWorkers)
- Use --bail to stop on first failure during development
- Configure collectCoverageFrom carefully to avoid unnecessary coverage collection
- Use --findRelatedTests in pre-commit hooks to test only staged files

## Integration Patterns

### Package.json Scripts Pattern

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

**Rationale for Separate Scripts**:
- `test` for local development with coverage
- `test:watch` for TDD workflow
- `test:ci` optimized for CI (--ci flag disables watch, --maxWorkers limits parallelism)
- `lint` for checking, `lint:fix` for auto-fixing
- `format` for writing, `format:check` for CI verification

### CI Integration Pattern (Phase 3)

**GitHub Actions Workflow** (.github/workflows/test.yml):
```yaml
# Add frontend testing job
frontend-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
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
```

## Retrospective Test Requirements (Feature #003)

**Bug Context**: HostDashboard.jsx had incorrect API response handling
- Expected flat response but accessed response.data
- setState calls received wrong data structure

**Test Coverage Required**:
1. **Test: setPoll receives response directly**
   - Mock createPoll to return flat object `{ id, title, state, roomCode }`
   - Verify component state updated with correct poll object

2. **Test: setPollState receives response.state**
   - Mock changePollState to return `{ state: 'open' }`
   - Verify component extracts state from response.state

3. **Test: joinSocketRoom receives response.roomCode**
   - Mock API to return `{ roomCode: 'ABC123' }`
   - Verify socket join called with correct room code

**Coverage Goal**: These three tests validate the bug fix and prevent regression

## Dependencies

**Production Dependencies** (none - dev dependencies only):
- All testing tools are devDependencies

**Dev Dependencies to Install**:
```bash
npm install --save-dev \
  jest@^30.0.0 \
  @testing-library/react@^14.0.0 \
  @testing-library/jest-dom@^6.1.0 \
  @testing-library/user-event@^14.5.0 \
  jest-environment-jsdom@^30.0.0 \
  identity-obj-proxy@^3.0.0
```

**Existing Dependencies to Verify**:
- ESLint and plugins (should already be installed)
- Prettier (should already be installed)
- Husky and lint-staged (should already be installed from backend setup)

## Open Questions Resolved

**Q: Jest vs Vitest?**
A: Jest - More mature, better documentation, stability over performance for infrastructure setup

**Q: Modify existing ESLint/Prettier rules?**
A: No - Activate existing configurations as-is via npm scripts only

**Q: Coverage threshold level?**
A: 80% for all metrics - Balances thoroughness with pragmatism

**Q: Test file organization?**
A: Follow backend pattern - contract/, unit/, integration/ separation

**Q: Should sample tests be created?**
A: Focus on retrospective tests for #003 bug - sample tests can be added later as needed

## Implementation Notes

**Order of Operations**:
1. Install dev dependencies
2. Create jest.config.js
3. Create tests/setup.js
4. Add npm scripts to package.json
5. Create test directory structure
6. Write retrospective contract tests
7. Verify tests pass
8. Update pre-commit hooks
9. (P3) Update CI configuration

**Validation Checkpoints**:
- After Jest config: `npm test` should run (even with no tests)
- After sample test: Test should pass and show coverage report
- After lint/format scripts: Commands should run successfully on existing code
- After pre-commit integration: Hook should block commits with quality issues

## References

- Jest Documentation: https://jestjs.io/docs/getting-started
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Testing Library Best Practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- Jest Configuration: https://jestjs.io/docs/configuration
- ESLint: https://eslint.org/docs/latest/use/getting-started
- Prettier: https://prettier.io/docs/en/index.html
