/**
 * auth-service.js - Authentication Service
 * Complete JWT-based authentication with security features
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, AuditLog } = require('../database/models');
const SecurityConfig = require('../config/security');

class AuthService {
  constructor() {
    this.failedAttempts = new Map();
  }

  /**
   * Register new user
   */
  async register(email, password) {
    // Validate password
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      return { success: false, error: validation.message };
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      passwordHash: hashedPassword,
      role: 'user'
    });

    // Log registration
    await this.logAudit(user.id, 'user_registered', { email });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  /**
   * Login user
   */
  async login(email, password, ipAddress, userAgent) {
    // Check lockout
    const lockout = this.checkLockout(email);
    if (lockout.locked) {
      return {
        success: false,
        error: `Account locked. Try again in ${lockout.remaining} minutes`,
        locked: true
      };
    }

    // Get user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      this.recordFailedAttempt(email);
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if active
    if (!user.isActive) {
      return { success: false, error: 'Account disabled' };
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.recordFailedAttempt(email);
      await this.logAudit(user.id, 'login_failed', { email, ipAddress }, 'warning');
      return { success: false, error: 'Invalid credentials' };
    }

    // Clear failed attempts
    this.clearFailedAttempts(email);

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Log success
    await this.logAudit(user.id, 'login_success', { email, ipAddress, userAgent });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      tokens
    };
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const config = SecurityConfig.auth.password;
    
    if (password.length < config.minLength) {
      return { valid: false, message: `Password must be ${config.minLength}+ characters` };
    }
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, message: 'Need uppercase letter' };
    }
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, message: 'Need lowercase letter' };
    }
    if (config.requireNumbers && !/[0-9]/.test(password)) {
      return { valid: false, message: 'Need number' };
    }
    if (config.requireSpecialChars && !/[!@#$%]/.test(password)) {
      return { valid: false, message: 'Need special char (!@#$%)' };
    }
    
    return { valid: true };
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      SecurityConfig.auth.jwtSecret,
      { expiresIn: SecurityConfig.auth.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      SecurityConfig.auth.jwtSecret,
      { expiresIn: SecurityConfig.auth.jwtRefreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, SecurityConfig.auth.jwtSecret);
    } catch (err) {
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, SecurityConfig.auth.jwtSecret);
      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Invalid token type' };
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return { success: false, error: 'User not found' };
      }

      const tokens = this.generateTokens(user);
      return { success: true, tokens };
    } catch (err) {
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  /**
   * Check lockout status
   */
  checkLockout(email) {
    const attempts = this.failedAttempts.get(email);
    if (!attempts) return { locked: false };

    if (attempts.count >= SecurityConfig.auth.lockout.maxAttempts) {
      const elapsed = Date.now() - attempts.lastAttempt;
      const remaining = SecurityConfig.auth.lockout.lockoutTime - elapsed;
      
      if (remaining > 0) {
        return { locked: true, remaining: Math.ceil(remaining / 60000) };
      }
      this.clearFailedAttempts(email);
    }

    return { locked: false };
  }

  recordFailedAttempt(email) {
    const existing = this.failedAttempts.get(email) || { count: 0 };
    existing.count++;
    existing.lastAttempt = Date.now();
    this.failedAttempts.set(email, existing);
  }

  clearFailedAttempts(email) {
    this.failedAttempts.delete(email);
  }

  /**
   * Log audit event
   */
  async logAudit(userId, action, details, severity = 'info') {
    await AuditLog.create({
      userId,
      action,
      details,
      severity
    });
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return { success: false, error: 'Current password incorrect' };
    }

    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.message };
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash: hashed });

    await this.logAudit(userId, 'password_changed', {});
    return { success: true };
  }

  /**
   * Logout
   */
  async logout(userId) {
    await this.logAudit(userId, 'logout', {});
    return { success: true };
  }
}

module.exports = new AuthService();
