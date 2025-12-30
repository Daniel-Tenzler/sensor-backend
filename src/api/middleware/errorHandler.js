/**
 * API Error Handling Middleware
 * Provides comprehensive error handling for API routes with structured JSON responses
 */

import { 
  APIError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  DatabaseError,
  SensorError,
  ERROR_CODES,
  logError, 
  sanitizeError,
  createErrorResponse
} from '../utils/errorHandler.js';

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Main API error handling middleware
 * Processes all errors and returns structured JSON responses
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

  // Log the error with context
  logError(err, req, {
    route: req.route?.path,
    params: req.params,
    body: req.body,
    query: req.query
  });

  // Handle different error types
  let errorResponse;
  let statusCode = 500;

  if (err instanceof APIError) {
    // Custom API errors
    errorResponse = err.toJSON();
    statusCode = err.statusCode;
  } else if (err.name === 'ValidationError' || err instanceof ValidationError) {
    // Validation errors
    errorResponse = createErrorResponse(
      'Validation failed',
      ERROR_CODES.VALIDATION_ERROR,
      err.message,
      400,
      err.details || null
    );
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError' || err instanceof AuthenticationError) {
    // Authentication errors
    errorResponse = createErrorResponse(
      'Authentication required',
      ERROR_CODES.UNAUTHORIZED,
      'Valid authentication required to access this resource',
      401
    );
    statusCode = 401;
  } else if (err.name === 'ForbiddenError' || err instanceof AuthorizationError) {
    // Authorization errors
    errorResponse = createErrorResponse(
      'Access forbidden',
      ERROR_CODES.FORBIDDEN,
      'Insufficient permissions to access this resource',
      403
    );
    statusCode = 403;
  } else if (err.name === 'NotFoundError' || err instanceof NotFoundError) {
    // Not found errors
    errorResponse = createErrorResponse(
      'Resource not found',
      ERROR_CODES.NOT_FOUND,
      'The requested resource was not found',
      404
    );
    statusCode = 404;
  } else if (err instanceof DatabaseError || err.message.includes('database')) {
    // Database errors
    errorResponse = createErrorResponse(
      'Database error',
      ERROR_CODES.DATABASE_ERROR,
      'A database error occurred',
      500
    );
    statusCode = 500;
  } else if (err instanceof SensorError) {
    // Sensor-specific errors
    errorResponse = err.toJSON();
    statusCode = err.statusCode;
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    // JSON parsing errors
    errorResponse = createErrorResponse(
      'Invalid JSON',
      ERROR_CODES.VALIDATION_ERROR,
      'Request body contains invalid JSON',
      400
    );
    statusCode = 400;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    // Connection errors
    errorResponse = createErrorResponse(
      'Service unavailable',
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'External service is currently unavailable',
      503
    );
    statusCode = 503;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // File upload size errors
    errorResponse = createErrorResponse(
      'File too large',
      ERROR_CODES.VALIDATION_ERROR,
      'Uploaded file exceeds size limit',
      413
    );
    statusCode = 413;
  } else if (err.code === 'EBADCSRFTOKEN') {
    // CSRF token errors
    errorResponse = createErrorResponse(
      'Invalid CSRF token',
      ERROR_CODES.FORBIDDEN,
      'Invalid or missing CSRF token',
      403
    );
    statusCode = 403;
  } else {
    // Generic server errors - sanitize for security
    errorResponse = sanitizeError(err);
    statusCode = errorResponse.statusCode || 500;
  }

  // Add request ID if available (useful for debugging)
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  return res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for API routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const apiNotFoundHandler = (req, res) => {
  const errorResponse = createErrorResponse(
    'API endpoint not found',
    ERROR_CODES.NOT_FOUND,
    `The API endpoint ${req.method} ${req.path} was not found`,
    404
  );

  res.status(404).json(errorResponse);
};

/**
 * Rate limiting error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rateLimitHandler = (req, res) => {
  const errorResponse = createErrorResponse(
    'Rate limit exceeded',
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    'Too many requests, please try again later',
    429
  );

  res.status(429).json(errorResponse);
};

/**
 * Validation middleware factory
 * Creates middleware to validate request data
 * @param {Object} schema - Validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Validation middleware
 */
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      
      // Simple validation example - in a real app you'd use a library like Joi or Yup
      if (schema.required) {
        for (const field of schema.required) {
          if (!data[field]) {
            throw new ValidationError(`${field} is required`);
          }
        }
      }
      
      if (schema.validate && typeof schema.validate === 'function') {
        const result = schema.validate(data);
        if (!result.valid) {
          throw new ValidationError(result.message, result.details);
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Error monitoring and alerting
 * Sends critical errors to monitoring service
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
export const monitorError = (error, req) => {
  // In a real application, you would send this to a monitoring service
  // like Sentry, DataDog, or CloudWatch
  
  if (error instanceof APIError && error.statusCode >= 500) {
    console.warn('CRITICAL ERROR DETECTED:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Example: Send to monitoring service
    // monitoringService.captureException(error, {
    //   user: req.user,
    //   request: req,
    //   level: 'error'
    // });
  }
};

/**
 * Health check error handler
 * Special error handling for health check endpoints
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const healthCheckErrorHandler = (err, req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return res.status(503).json({
      status: 'error',
      message: 'Service unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

export default {
  asyncHandler,
  apiErrorHandler,
  apiNotFoundHandler,
  rateLimitHandler,
  validateRequest,
  monitorError,
  healthCheckErrorHandler
};