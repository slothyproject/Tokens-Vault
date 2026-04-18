/**
 * tests/setup.js - Jest Test Setup
 * Configure test environment
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-chars-long!!';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to debug:
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error // Keep error logging
};

// Global test timeout
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});
