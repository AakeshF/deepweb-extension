/**
 * Jest configuration for Firefox extension unit tests
 */

module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    'background-firefox.js',
    'content/**/*.js',
    'popup/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testTimeout: 10000,
  verbose: true
};