/**
 * Jest Configuration
 * Testing framework for Central Hub
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test files location
  roots: ['<rootDir>/tests'],
  
  // Test match pattern
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'database/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reports
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Verbose output
  verbose: true,
  
  // Fail on console errors in tests
  errorOnDeprecated: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};