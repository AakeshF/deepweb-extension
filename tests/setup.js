/**
 * Jest setup file for Firefox extension testing
 */

// Mock browser APIs
require('jest-webextension-mock');

// Add custom matchers
expect.extend({
  toBeValidManifest(received) {
    const pass = received && 
      typeof received === 'object' && 
      received.manifest_version === 2 &&
      received.name &&
      received.version;
    
    return {
      message: () => `expected ${received} to be a valid manifest`,
      pass
    };
  }
});

// Mock fetch API
global.fetch = jest.fn();

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Mock console methods in test environment
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};