/**
 * API Error Handling Utilities
 * Provides structured error response utilities for consistent API error formatting
 */

/**
 * Standard error codes used throughout the API
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_ERROR: 'SESSION_ERROR',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // Sensor specific
  SENSOR_ERROR: 'SENSOR_ERROR',
  INVALID_SENSOR_DATA: 'INVALID_SENSOR_DATA',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

/**
 * Custom API Error class for structured error handling
 */
export class APIError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
  
  /**
   * Convert error to JSON response format
   * @returns {Object} Structured error response
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation Error class
 */
export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_CODES.UNAUTHORIZED, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Access forbidden') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 */
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Database Error class
 */
export class DatabaseError extends APIError {
  constructor(message = 'Database operation failed') {
    super(message, ERROR_CODES.DATABASE_ERROR, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Sensor Error class
 */
export class SensorError extends APIError {
  constructor(message, statusCode = 400) {
    super(message, ERROR_CODES.SENSOR_ERROR, statusCode);
    this.name = 'SensorError';
  }
}

/**
 * Create a structured API error response
 * @param {string} error - Error message
 * @param {string} code - Error code
 * @param {string} message - User-friendly message
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Additional error details
 * @returns {Object} Structured error response
 */
export const createErrorResponse = (error, code, message, statusCode = 500, details = null) => ({
  success: false,
  error,
  code,
  message,
  details,
  timestamp: new Date().toISOString(),
  statusCode
});

/**
 * Log error with structured format
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} context - Additional context
 */
export const logError = (error, req = null, context = {}) => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN'
    },
    timestamp: new Date().toISOString(),
    context
  };

  if (req) {
    logData.request = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || null
    };
  }

  console.error('API Error:', JSON.stringify(logData, null, 2));
};

/**
 * Determine if error should be exposed to client
 * @param {Error} error - Error object
 * @returns {boolean} Whether error details should be exposed
 */
export const shouldExposeError = (error) => {
  // Expose validation and client errors
  if (error instanceof ValidationError || 
      error instanceof AuthenticationError || 
      error instanceof AuthorizationError || 
      error instanceof NotFoundError ||
      error instanceof SensorError) {
    return true;
  }
  
  // Don't expose internal server errors in production
  return process.env.NODE_ENV !== 'production';
};

/**
 * Sanitize error for client response
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error response
 */
export const sanitizeError = (error) => {
  if (shouldExposeError(error)) {
    if (error instanceof APIError) {
      return error.toJSON();
    }
    
    return createErrorResponse(
      error.message,
      error.code || ERROR_CODES.INTERNAL_ERROR,
      error.message,
      error.statusCode || 500,
      error.details || null
    );
  }
  
  // Return generic error for internal server errors
  return createErrorResponse(
    'Internal server error',
    ERROR_CODES.INTERNAL_ERROR,
    'An unexpected error occurred',
    500
  );
};

export default {
  ERROR_CODES,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  SensorError,
  createErrorResponse,
  logError,
  shouldExposeError,
  sanitizeError
};