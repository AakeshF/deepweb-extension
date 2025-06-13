/**
 * Jest configuration for E2E tests with Puppeteer
 */

module.exports = {
  preset: 'jest-puppeteer',
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],
  globals: {
    EXTENSION_PATH: '<rootDir>/dist'
  }
};