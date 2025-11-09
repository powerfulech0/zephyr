module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'prettier', // Disables ESLint formatting rules that conflict with Prettier
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow error logging
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Ignore unused params prefixed with _
    'import/extensions': ['warn', 'ignorePackages'], // Warn on missing .js extensions (not error)
    'max-len': ['warn', { code: 100, ignoreUrls: true }], // Soft limit, matches Prettier
    'no-underscore-dangle': ['error', { allowAfterThis: true, allow: ['_generateUniqueRoomCode', '_calculateVoteCounts', '_calculatePercentages'] }], // Allow private methods
    'class-methods-use-this': 'off', // Allow utility methods in classes
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }], // Allow ++ in for loops
    'consistent-return': 'warn', // Warn instead of error
  },
  overrides: [
    {
      // Relax rules for test files
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-plusplus': 'off', // Allow ++ in tests
        'no-await-in-loop': 'off', // Allow await in loops in tests
        'global-require': 'off', // Allow require() in tests
        'no-promise-executor-return': 'off', // Allow promise executor returns in tests
        'no-loop-func': 'off', // Allow functions in loops in tests
        'import/extensions': 'off', // Don't require .js extensions in tests
        'consistent-return': 'off', // Allow inconsistent returns in tests
        'max-len': 'off', // No line length limits in tests
        'no-restricted-syntax': 'off', // Allow for-of loops in tests
        'no-use-before-define': 'off', // Allow hoisting in tests
        'no-unused-vars': 'warn', // Warn instead of error for unused vars in tests
        'no-script-url': 'off', // Allow script URLs in tests
        'no-shadow': 'off', // Allow variable shadowing in tests
        'no-underscore-dangle': 'off', // Allow underscores (socket.io internals) in tests
        camelcase: 'off', // Allow snake_case (database columns) in tests
        'jest/no-conditional-expect': 'off', // Allow conditional expects in tests
        'jest/no-done-callback': 'off', // Allow done callbacks in tests
        'jest/expect-expect': 'off', // Allow tests without explicit expects
      },
    },
  ],
};
