export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './.babelrc' }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
  ],
  coverageThreshold: {
    global: {
      branches: 0, // Set to 0 initially, will increase as more tests are written
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
};
