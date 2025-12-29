import sessionManager from '../../shared/middleware/sessionManager.js';
import { AuthenticationError, DatabaseError } from '../utils/errorHandler.js';
import config from '../../config/index.js';

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
  // Express normalizes headers to lowercase, but check both for robustness
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && typeof authHeader === 'string') {
    // Handle both "Bearer token" and "bearer token" (case-insensitive)
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      const token = bearerMatch[1];
      return token;
    } else {
      // If no "Bearer " prefix, treat the entire header as the token
      // This handles cases where the token is sent directly
      console.log('[Auth Debug] No Bearer prefix found, treating entire header as token');
      return authHeader.trim();
    }
  }
  console.log('[Auth Debug] No Bearer token found in Authorization header');
  return null;
};

/**
 * Validate Bearer token against API_SECRET
 * @param {string} token - Bearer token to validate
 * @returns {boolean} True if token is valid
 */
const validateBearerToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Ensure both token and secret are trimmed for comparison
  const trimmedToken = token.trim();
  const secret = String(config.API_SECRET || '').trim();

  // If secret is not configured, reject all tokens
  if (!secret || secret.length === 0) {
    console.log('[Auth Debug] Token validation failed: API_SECRET is not configured');
    return false;
  }

  // Simple string comparison (both are already trimmed)
  const isValid = trimmedToken === secret;
  return isValid;
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
    if (bearerToken) {
      console.log('[Auth Debug] Bearer token found, attempting validation');
      const isValid = validateBearerToken(bearerToken);
      if (isValid) {
        console.log('[Auth Debug] Bearer token authentication successful');
        // Bearer token is valid, authenticate as sensor-user
        req.user = {
          id: 'sensor-user',
          sessionId: null,
          authenticated: true,
          authMethod: 'bearer'
        };
        return next();
      }
      // Bearer token was provided but is invalid - don't fall back to session
      console.log('[Auth Debug] Bearer token authentication failed - token is invalid');
      return next(new AuthenticationError('Invalid Bearer token provided'));
    }

    console.log('[Auth Debug] No Bearer token found, falling back to session authentication');
    // Fall back to session-based authentication
    const sessionData = await sessionManager.validateSession(req);

    if (!sessionData) {
      console.log('[Auth Debug] Session authentication failed - no valid session');
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
    console.error('[Auth Debug] Authentication error:', {
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name
    });

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
