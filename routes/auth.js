/**
 * routes/auth.js - Authentication API Routes
 * RESTful API for user authentication
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/auth-service');
const { User } = require('../database/models');

// Middleware to get client info
const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent']
});

/**
 * POST /api/auth/register
 * Register new user
 */
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 description: User's password (min 12 chars, must contain uppercase, lowercase, number, special char)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password required' 
      });
    }

    const result = await AuthService.register(email, password);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Account locked
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password required' 
      });
    }

    const result = await AuthService.login(
      email, 
      password, 
      clientInfo.ipAddress, 
      clientInfo.userAgent
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token required' 
      });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await AuthService.logout(req.user.userId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current and new password required' 
      });
    }

    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    res.status(500).json({ success: false, error: 'Password change failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'email', 'role', 'lastLogin', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('[Auth] Get user error:', err);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

/**
 * Middleware: Authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const decoded = AuthService.verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
