import sessionManager from '../../shared/middleware/sessionManager.js';
import { AuthenticationError, DatabaseError } from '../utils/errorHandler.js';
import { sessionConfig } from '../../config/session.js';

/**
 * API Authentication Middleware
 * Validates session cookies and returns JSON responses for API routes
 * Also supports Bearer token authentication for sensor devices
 */

/**
 * Extract Bearer token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Bearer token or null
 */
const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Validate Bearer token against SESSION_SECRET
 * @param {string} token - Bearer token to validate
 * @returns {boolean} True if token is valid
 */
const validateBearerToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  return token.trim() === sessionConfig.secret;
};

/**
 * Middleware to authenticate API requests using session cookies or Bearer tokens
 * Returns JSON error responses for authentication failures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateAPI = async (req, res, next) => {
  try {
    // First, try Bearer token authentication (for sensor devices)
    const bearerToken = extractBearerToken(req);
    if (bearerToken && validateBearerToken(bearerToken)) {
      // Bearer token is valid, authenticate as sensor-user
      req.user = {
        id: 'sensor-user',
        sessionId: null,
        authenticated: true,
        authMethod: 'bearer'
      };
      return next();
    }

    // Fall back to session-based authentication
    const sessionData = await sessionManager.validateSession(req);

    if (!sessionData) {
      return next(
        new AuthenticationError('Valid session or Bearer token required to access this resource')
      );
    }

    // Attach user context to request object
    req.user = {
      id: sessionData.userId,
      sessionId: sessionData.sessionId,
      authenticated: true,
      authMethod: 'session'
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    return next(new DatabaseError('An error occurred during authentication'));
  }
};

/**
 * Middleware to require authentication for API routes
 * This is an alias for authenticateAPI for better readability
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAPIAuth = authenticateAPI;

/**
 * Middleware to optionally authenticate API requests
 * Continues even if authentication fails, but attaches user context if successful
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAPIAuth = async (req, res, next) => {
  try {
    const sessionData = await sessionManager.validateSession(req);

    if (sessionData) {
      // Attach user context to request object
      req.user = {
        id: sessionData.userId,
        sessionId: sessionData.sessionId,
        authenticated: true
      };
    } else {
      // Set unauthenticated user context
      req.user = {
        id: null,
        sessionId: null,
        authenticated: false
      };
    }

    next();
  } catch (error) {
    // For optional auth, continue even on error but log it
    console.error('Optional API authentication error:', error);
    req.user = {
      id: null,
      sessionId: null,
      authenticated: false
    };
    next();
  }
};

/**
 * Utility function to create structured API error responses
 * @param {string} error - Error message
 * @param {string} code - Error code
 * @param {string} message - User-friendly message
 * @param {number} status - HTTP status code
 * @returns {Object} Structured error response
 */
export const createAPIError = (error, code, message, status = 500) => ({
  success: false,
  error,
  code,
  message,
  timestamp: new Date().toISOString(),
  status
});

/**
 * @returns {Function} Express middleware function
 */
export const requirePermissions = () => {
  return (req, res, next) => {
    if (!req.user || !req.user.authenticated) {
      return res
        .status(401)
        .json(
          createAPIError(
            'Authentication required',
            'UNAUTHORIZED',
            'Authentication required to access this resource',
            401
          )
        );
    }

    // For now, we'll assume all authenticated users have all permissions
    // In a real application, you would check user permissions against a database
    // or permission service

    // Example permission check (commented out):
    // const userPermissions = await getUserPermissions(req.user.id);
    // const hasPermission = requiredPermissions.every(perm =>
    //   userPermissions.includes(perm)
    // );
    //
    // if (!hasPermission) {
    //   return res.status(403).json(createAPIError(
    //     'Insufficient permissions',
    //     'FORBIDDEN',
    //     'You do not have permission to access this resource',
    //     403
    //   ));
    // }

    next();
  };
};

export default {
  authenticateAPI,
  requireAPIAuth,
  optionalAPIAuth,
  createAPIError,
  requirePermissions
};
