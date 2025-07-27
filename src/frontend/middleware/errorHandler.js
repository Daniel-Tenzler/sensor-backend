/**
 * Frontend Error Handling Middleware
 * Provides comprehensive error handling for frontend routes with HTML responses
 */

import {
  FrontendError,
  FrontendAuthError,
  FrontendNotFoundError,
  FrontendValidationError,
  FRONTEND_ERROR_TYPES,
  generateErrorHTML,
  generateMaintenanceHTML,
  logFrontendError,
  getErrorDetails
} from '../utils/errorHandler.js';

/**
 * Async error wrapper for frontend route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Main frontend error handling middleware
 * Processes all errors and returns appropriate HTML responses
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const frontendErrorHandler = (err, req, res, next) => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log the error with context
  logFrontendError(err, req, {
    route: req.route?.path,
    params: req.params,
    body: req.body,
    query: req.query
  });

  // Handle different error types
  let errorDetails;
  let statusCode = 500;

  if (err instanceof FrontendError) {
    // Custom frontend errors
    errorDetails = getErrorDetails(err.type);
    statusCode = err.statusCode;
    errorDetails.message = err.message; // Use custom message
  } else if (err instanceof FrontendAuthError) {
    // Authentication errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED);
    statusCode = 401;
    errorDetails.message = err.message;
  } else if (err instanceof FrontendNotFoundError) {
    // Not found errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND);
    statusCode = 404;
    errorDetails.message = err.message;
  } else if (err instanceof FrontendValidationError) {
    // Validation errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.VALIDATION_ERROR);
    statusCode = 400;
    errorDetails.message = err.message;
  } else if (err.name === 'UnauthorizedError' || err.message.includes('authentication')) {
    // Authentication errors from other sources
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED);
    statusCode = 401;
  } else if (err.name === 'ForbiddenError' || err.message.includes('forbidden')) {
    // Authorization errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.ACCESS_FORBIDDEN);
    statusCode = 403;
  } else if (err.message.includes('session') && err.message.includes('expired')) {
    // Session expiration errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.SESSION_EXPIRED);
    statusCode = 401;
  } else if (err.message.includes('database') || err.message.includes('query')) {
    // Database errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.DATABASE_ERROR);
    statusCode = 500;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    // Network/connection errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.SERVICE_UNAVAILABLE);
    statusCode = 503;
  } else if (err.code === 'TIMEOUT' || err.message.includes('timeout')) {
    // Timeout errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.TIMEOUT_ERROR);
    statusCode = 408;
  } else {
    // Generic server errors
    errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.INTERNAL_ERROR);
    statusCode = 500;
  }

  // Generate error HTML
  const errorHTML = generateErrorHTML(
    errorDetails.title,
    errorDetails.message,
    statusCode,
    {
      showBackButton: statusCode !== 401, // Don't show back button for auth errors
      showHomeButton: errorDetails.showHomeButton !== false,
      showLoginButton: errorDetails.showLoginButton === true,
      additionalInfo: process.env.NODE_ENV === 'development' ? err.stack : null
    }
  );

  // Set appropriate headers
  res.status(statusCode);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(errorHTML);
};

/**
 * 404 handler for frontend routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const frontendNotFoundHandler = (req, res) => {
  const errorDetails = getErrorDetails(FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND);
  
  const errorHTML = generateErrorHTML(
    errorDetails.title,
    `The page "${req.path}" was not found.`,
    404,
    {
      showBackButton: true,
      showHomeButton: true,
      showLoginButton: false
    }
  );

  res.status(404);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(errorHTML);
};

/**
 * Maintenance mode handler
 * @param {string} message - Maintenance message
 * @param {Date} estimatedEnd - Estimated end time
 * @returns {Function} Express middleware function
 */
export const maintenanceHandler = (message, estimatedEnd = null) => {
  return (req, res) => {
    const maintenanceHTML = generateMaintenanceHTML(message, estimatedEnd);
    
    res.status(503);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Retry-After', '300'); // Retry after 5 minutes
    res.send(maintenanceHTML);
  };
};

/**
 * Authentication error handler specifically for frontend routes
 * Redirects to login page with appropriate return URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} message - Optional error message
 */
export const handleAuthenticationError = (req, res, message = 'Authentication required') => {
  // For AJAX requests, return JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: message,
      redirectUrl: `/login?returnUrl=${encodeURIComponent(req.originalUrl)}`
    });
  }

  // For regular requests, redirect to login
  const returnUrl = encodeURIComponent(req.originalUrl);
  const errorParam = encodeURIComponent(message);
  res.redirect(`/login?error=auth_required&message=${errorParam}&returnUrl=${returnUrl}`);
};

/**
 * Session validation middleware
 * Checks if user session is valid and handles errors appropriately
 * @param {Function} sessionValidator - Function to validate session
 * @returns {Function} Express middleware function
 */
export const validateSession = (sessionValidator) => {
  return async (req, res, next) => {
    try {
      const isValid = await sessionValidator(req);
      
      if (!isValid) {
        return handleAuthenticationError(req, res, 'Your session has expired. Please log in again.');
      }
      
      next();
    } catch (error) {
      logFrontendError(error, req, { middleware: 'validateSession' });
      return handleAuthenticationError(req, res, 'Session validation failed');
    }
  };
};

/**
 * Rate limiting error handler for frontend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rateLimitErrorHandler = (req, res) => {
  const errorHTML = generateErrorHTML(
    'Too Many Requests',
    'You have made too many requests. Please wait a moment and try again.',
    429,
    {
      showBackButton: true,
      showHomeButton: true,
      showLoginButton: false,
      customActions: [
        { url: 'javascript:location.reload()', text: 'Retry', class: 'btn-primary' }
      ]
    }
  );

  res.status(429);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Retry-After', '60'); // Retry after 1 minute
  res.send(errorHTML);
};

/**
 * CSRF error handler for frontend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const csrfErrorHandler = (req, res) => {
  const errorHTML = generateErrorHTML(
    'Security Error',
    'Invalid security token. Please refresh the page and try again.',
    403,
    {
      showBackButton: false,
      showHomeButton: true,
      showLoginButton: false,
      customActions: [
        { url: 'javascript:location.reload()', text: 'Refresh Page', class: 'btn-primary' }
      ]
    }
  );

  res.status(403);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(errorHTML);
};

/**
 * Health check error handler for frontend
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const healthCheckErrorHandler = (err, req, res, next) => {
  if (req.path === '/health' || req.path === '/status') {
    const errorHTML = generateErrorHTML(
      'Service Unhealthy',
      'The service is currently experiencing issues.',
      503,
      {
        showBackButton: false,
        showHomeButton: true,
        showLoginButton: false,
        additionalInfo: process.env.NODE_ENV === 'development' ? err.message : null
      }
    );

    return res.status(503).send(errorHTML);
  }
  
  next(err);
};

/**
 * Error monitoring for frontend errors
 * Sends critical errors to monitoring service
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
export const monitorFrontendError = (error, req) => {
  // Monitor critical errors (5xx status codes)
  if (error instanceof FrontendError && error.statusCode >= 500) {
    console.warn('CRITICAL FRONTEND ERROR:', {
      error: error.message,
      type: error.type,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // In a real application, you would send this to a monitoring service
    // monitoringService.captureException(error, {
    //   user: req.user,
    //   request: req,
    //   level: 'error',
    //   tags: { component: 'frontend' }
    // });
  }
};

export default {
  asyncHandler,
  frontendErrorHandler,
  frontendNotFoundHandler,
  maintenanceHandler,
  handleAuthenticationError,
  validateSession,
  rateLimitErrorHandler,
  csrfErrorHandler,
  healthCheckErrorHandler,
  monitorFrontendError
};