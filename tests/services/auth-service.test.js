/**
 * Auth Service Tests
 * Comprehensive test suite for authentication
 */

const AuthService = require('../../services/auth-service');
const { User } = require('../../database/models');

describe('AuthService', () => {
  beforeEach(() => {
    // Clear any cached state
    AuthService.failedAttempts.clear();
  });

  describe('Password Validation', () => {
    test('should accept strong password', () => {
      const result = AuthService.validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
    });

    test('should reject short password', () => {
      const result = AuthService.validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('12');
    });

    test('should reject password without uppercase', () => {
      const result = AuthService.validatePassword('lowercase123!');
      expect(result.valid).toBe(false);
    });

    test('should reject password without number', () => {
      const result = AuthService.validatePassword('NoNumbersHere!');
      expect(result.valid).toBe(false);
    });

    test('should reject password without special char', () => {
      const result = AuthService.validatePassword('NoSpecialChars123');
      expect(result.valid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    test('should generate valid JWT tokens', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };

      const tokens = AuthService.generateTokens(user);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should verify generated tokens', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };

      const tokens = AuthService.generateTokens(user);
      const decoded = AuthService.verifyToken(tokens.accessToken);
      
      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });

    test('should reject invalid tokens', () => {
      const decoded = AuthService.verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('Account Lockout', () => {
    test('should lock account after 5 failed attempts', () => {
      const email = 'test@example.com';
      
      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        AuthService.recordFailedAttempt(email);
      }

      const status = AuthService.checkLockout(email);
      expect(status.locked).toBe(true);
    });

    test('should clear failed attempts', () => {
      const email = 'test@example.com';
      
      AuthService.recordFailedAttempt(email);
      AuthService.clearFailedAttempts(email);
      
      const status = AuthService.checkLockout(email);
      expect(status.locked).toBe(false);
    });
  });
});
