/**
 * Frontend Error Handling Utilities
 * Provides structured error handling for frontend routes with HTML responses
 */

/**
 * Standard error types for frontend
 */
export const FRONTEND_ERROR_TYPES = {
  // Authentication & Authorization
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  ACCESS_FORBIDDEN: 'ACCESS_FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
};

/**
 * Custom Frontend Error class
 */
export class FrontendError extends Error {
  constructor(message, type = FRONTEND_ERROR_TYPES.INTERNAL_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'FrontendError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FrontendError);
    }
  }
}

/**
 * Authentication Error class
 */
export class FrontendAuthError extends FrontendError {
  constructor(message = 'Authentication required') {
    super(message, FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED, 401);
    this.name = 'FrontendAuthError';
  }
}

/**
 * Not Found Error class
 */
export class FrontendNotFoundError extends FrontendError {
  constructor(message = 'Page not found') {
    super(message, FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND, 404);
    this.name = 'FrontendNotFoundError';
  }
}

/**
 * Validation Error class
 */
export class FrontendValidationError extends FrontendError {
  constructor(message, details = null) {
    super(message, FRONTEND_ERROR_TYPES.VALIDATION_ERROR, 400, details);
    this.name = 'FrontendValidationError';
  }
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate error page HTML
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} options - Additional options
 * @returns {string} HTML content
 */
export const generateErrorHTML = (title, message, statusCode = 500, options = {}) => {
  const {
    showBackButton = true,
    showHomeButton = true,
    showLoginButton = false,
    customActions = [],
    additionalInfo = null
  } = options;

  const backButton = showBackButton ? 
    '<button onclick="history.back()" class="btn btn-secondary">Go Back</button>' : '';
  
  const homeButton = showHomeButton ? 
    '<a href="/" class="btn btn-secondary">Go to Dashboard</a>' : '';
  
  const loginButton = showLoginButton ? 
    '<a href="/login" class="btn">Go to Login</a>' : '';
  
  const customActionsHTML = customActions.map(action => 
    `<a href="${escapeHtml(action.url)}" class="btn ${action.class || ''}">${escapeHtml(action.text)}</a>`
  ).join('');

  const additionalInfoHTML = additionalInfo ? 
    `<div class="error-details">${escapeHtml(additionalInfo)}</div>` : '';

  const errorClass = statusCode >= 500 ? 'server-error' : 
                    statusCode >= 400 ? 'client-error' : 'general-error';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - Sensor Dashboard</title>
    <link rel="stylesheet" href="/css/error.css">
</head>
<body>
    <div class="error-container ${errorClass}">
        <div class="error-content">
            <div class="error-icon">
                ${getErrorIcon(statusCode)}
            </div>
            <h1 class="error-title">${escapeHtml(title)}</h1>
            <p class="error-message">${escapeHtml(message)}</p>
            ${additionalInfoHTML}
            <div class="error-actions">
                ${loginButton}
                ${homeButton}
                ${backButton}
                ${customActionsHTML}
            </div>
            <div class="error-meta">
                <p>Error Code: ${statusCode}</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Get appropriate error icon based on status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} SVG icon HTML
 */
const getErrorIcon = (statusCode) => {
  if (statusCode === 404) {
    return `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="m9 9 6 6"/>
        <path d="m15 9-6 6"/>
      </svg>`;
  } else if (statusCode === 403) {
    return `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <circle cx="12" cy="16" r="1"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>`;
  } else if (statusCode >= 500) {
    return `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`;
  } else {
    return `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`;
  }
};

/**
 * Generate maintenance page HTML
 * @param {string} message - Maintenance message
 * @param {Date} estimatedEnd - Estimated end time
 * @returns {string} HTML content
 */
export const generateMaintenanceHTML = (message = 'System is under maintenance', estimatedEnd = null) => {
  const estimatedEndHTML = estimatedEnd ? 
    `<p class="maintenance-time">Estimated completion: ${estimatedEnd.toLocaleString()}</p>` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - Sensor Dashboard</title>
    <link rel="stylesheet" href="/css/error.css">
    <meta http-equiv="refresh" content="300">
</head>
<body>
    <div class="error-container maintenance">
        <div class="error-content">
            <div class="error-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
            </div>
            <h1 class="error-title">System Maintenance</h1>
            <p class="error-message">${escapeHtml(message)}</p>
            ${estimatedEndHTML}
            <div class="maintenance-info">
                <p>We're working to improve your experience. Please check back shortly.</p>
                <p>This page will automatically refresh every 5 minutes.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Log frontend error with structured format
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} context - Additional context
 */
export const logFrontendError = (error, req = null, context = {}) => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: error.type || 'UNKNOWN'
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
      userId: req.user?.id || null,
      sessionId: req.sessionID || null
    };
  }

  console.error('Frontend Error:', JSON.stringify(logData, null, 2));
};

/**
 * Get user-friendly error message based on error type
 * @param {string} errorType - Error type
 * @returns {Object} Error details
 */
export const getErrorDetails = (errorType) => {
  const errorMap = {
    [FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED]: {
      title: 'Authentication Required',
      message: 'You need to log in to access this page.',
      statusCode: 401,
      showLoginButton: true,
      showHomeButton: false
    },
    [FRONTEND_ERROR_TYPES.ACCESS_FORBIDDEN]: {
      title: 'Access Forbidden',
      message: 'You do not have permission to access this resource.',
      statusCode: 403,
      showLoginButton: true
    },
    [FRONTEND_ERROR_TYPES.SESSION_EXPIRED]: {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      showLoginButton: true,
      showHomeButton: false
    },
    [FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND]: {
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist.',
      statusCode: 404
    },
    [FRONTEND_ERROR_TYPES.VALIDATION_ERROR]: {
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
      statusCode: 400
    },
    [FRONTEND_ERROR_TYPES.INTERNAL_ERROR]: {
      title: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500
    },
    [FRONTEND_ERROR_TYPES.SERVICE_UNAVAILABLE]: {
      title: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.',
      statusCode: 503
    },
    [FRONTEND_ERROR_TYPES.DATABASE_ERROR]: {
      title: 'Database Error',
      message: 'A database error occurred. Please try again later.',
      statusCode: 500
    },
    [FRONTEND_ERROR_TYPES.NETWORK_ERROR]: {
      title: 'Network Error',
      message: 'A network error occurred. Please check your connection and try again.',
      statusCode: 500
    },
    [FRONTEND_ERROR_TYPES.TIMEOUT_ERROR]: {
      title: 'Request Timeout',
      message: 'The request took too long to complete. Please try again.',
      statusCode: 408
    }
  };

  return errorMap[errorType] || errorMap[FRONTEND_ERROR_TYPES.INTERNAL_ERROR];
};

export default {
  FRONTEND_ERROR_TYPES,
  FrontendError,
  FrontendAuthError,
  FrontendNotFoundError,
  FrontendValidationError,
  escapeHtml,
  generateErrorHTML,
  generateMaintenanceHTML,
  logFrontendError,
  getErrorDetails
};