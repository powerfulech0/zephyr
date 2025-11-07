module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb',
    'airbnb/hooks',
    'prettier',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'max-len': ['warn', { code: 100, ignoreUrls: true }],
  },
};
