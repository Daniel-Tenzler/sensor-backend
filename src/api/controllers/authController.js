import sessionManager from '../../shared/middleware/sessionManager.js';
import { 
  ValidationError, 
  AuthenticationError, 
  DatabaseError 
} from '../utils/errorHandler.js';


/**
 * API Authentication Controller
 * Handles login and logout endpoints with JSON-only responses
 */

/**
 * Validate login input
 * @param {string} secret - The secret key provided
 * @throws {ValidationError} If validation fails
 */
const validateLoginInput = (secret) => {
  if (!secret || typeof secret !== 'string') {
    throw new ValidationError('Secret is required and must be a string', { field: 'secret' });
  }
  
  if (secret.trim().length === 0) {
    throw new ValidationError('Secret cannot be empty', { field: 'secret' });
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

    // For now, we'll use a simple hardcoded authentication
    // In a real application, this would validate against a user database
    if (!secret || secret.trim() === '') {
      throw new AuthenticationError('Invalid credentials provided');
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
    // Handle session creation errors
    if (error.message.includes('session')) {
      throw new DatabaseError('Unable to create user session');
    }

    // Let the error middleware handle other errors
    throw error;
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
    // Even if session destruction fails, we should still respond with success
    // from the client's perspective, they are logged out
    console.warn('Logout error (non-critical):', error.message);
    
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

  } catch {
    // Let the error middleware handle the error
    throw new DatabaseError('Unable to validate session status');
  }
};

export default {
  login,
  logout,
  getSessionStatus
};