import sessionManager from '../../shared/middleware/sessionManager.js';

/**
 * API Authentication Middleware
 * Validates session cookies and returns JSON responses for API routes
 */

/**
 * Middleware to authenticate API requests using session cookies
 * Returns JSON error responses for authentication failures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateAPI = async (req, res, next) => {
  try {
    const sessionData = await sessionManager.validateSession(req);
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        message: 'Valid session required to access this resource',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user context to request object
    req.user = {
      id: sessionData.userId,
      sessionId: sessionData.sessionId,
      authenticated: true
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication',
      timestamp: new Date().toISOString()
    });
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
 * Middleware to handle API errors and return structured JSON responses
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const apiErrorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error for debugging
  console.error('API Error:', err);

  // Determine error type and create appropriate response
  let errorResponse;
  
  if (err.name === 'ValidationError') {
    errorResponse = createAPIError(
      'Validation failed',
      'VALIDATION_ERROR',
      err.message,
      400
    );
  } else if (err.name === 'UnauthorizedError') {
    errorResponse = createAPIError(
      'Authentication required',
      'UNAUTHORIZED',
      'Valid authentication required to access this resource',
      401
    );
  } else if (err.name === 'ForbiddenError') {
    errorResponse = createAPIError(
      'Access forbidden',
      'FORBIDDEN',
      'Insufficient permissions to access this resource',
      403
    );
  } else if (err.name === 'NotFoundError') {
    errorResponse = createAPIError(
      'Resource not found',
      'NOT_FOUND',
      'The requested resource was not found',
      404
    );
  } else {
    // Generic server error
    errorResponse = createAPIError(
      'Internal server error',
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }

  return res.status(errorResponse.status).json(errorResponse);
};

/**
 * Middleware to check if user has specific permissions
 * @param {string|Array} permissions - Required permission(s)
 * @returns {Function} Express middleware function
 */
export const requirePermissions = (permissions) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req, res, next) => {
    if (!req.user || !req.user.authenticated) {
      return res.status(401).json(createAPIError(
        'Authentication required',
        'UNAUTHORIZED',
        'Authentication required to access this resource',
        401
      ));
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
  apiErrorHandler,
  requirePermissions
};