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
    'import/extensions': ['error', 'ignorePackages'], // Require .js extensions in imports
    'max-len': ['warn', { code: 100, ignoreUrls: true }], // Soft limit, matches Prettier
  },
};
