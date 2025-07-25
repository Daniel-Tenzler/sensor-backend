import sessionManager from '../../shared/middleware/sessionManager.js';
import { hashSecret } from '../../utils/auth.js';
import { SECRET_KEY } from '../../config/app.js';
import { createAPIError } from '../middleware/apiAuth.js';

/**
 * API Authentication Controller
 * Handles login and logout endpoints with JSON-only responses
 */

/**
 * Validate login input
 * @param {string} secret - The secret key provided
 * @throws {Error} If validation fails
 */
const validateLoginInput = (secret) => {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret is required and must be a string');
  }
  
  if (secret.trim().length === 0) {
    throw new Error('Secret cannot be empty');
  }
};

/**
 * Login endpoint - Creates session and sets secure cookie
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
  try {
    const { secret } = req.body;

    // Validate input
    validateLoginInput(secret);

    // Verify the secret matches the expected hash
    const expectedHash = hashSecret(SECRET_KEY);
    const providedHash = hashSecret(secret);

    if (providedHash !== expectedHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: 'The provided secret is incorrect',
        timestamp: new Date().toISOString()
      });
    }

    // Create session for authenticated user
    // Using a generic user ID since we only have secret-based auth
    const userId = 'sensor-user';
    const sessionId = await sessionManager.createSession(userId, req);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: userId,
          authenticated: true
        },
        sessionId: sessionId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle validation errors
    if (error.message.includes('Secret')) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Handle session creation errors
    if (error.message.includes('session')) {
      return res.status(500).json({
        success: false,
        error: 'Session creation failed',
        code: 'SESSION_ERROR',
        message: 'Unable to create user session',
        timestamp: new Date().toISOString()
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during login',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Logout endpoint - Destroys session and clears cookies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logout = async (req, res) => {
  try {
    // Destroy the session
    await sessionManager.destroySession(req, res);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: {
        user: {
          authenticated: false
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Even if session destruction fails, we should still respond with success
    // from the client's perspective, they are logged out
    res.status(200).json({
      success: true,
      message: 'Logout completed',
      data: {
        user: {
          authenticated: false
        }
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get current user session status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSessionStatus = async (req, res) => {
  try {
    const sessionData = await sessionManager.validateSession(req);

    if (!sessionData) {
      return res.status(200).json({
        success: true,
        message: 'No active session',
        data: {
          user: {
            authenticated: false
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Active session found',
      data: {
        user: {
          id: sessionData.userId,
          authenticated: true
        },
        session: {
          id: sessionData.sessionId,
          createdAt: sessionData.createdAt
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session status error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Session validation failed',
      code: 'SESSION_ERROR',
      message: 'Unable to validate session status',
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  login,
  logout,
  getSessionStatus
};