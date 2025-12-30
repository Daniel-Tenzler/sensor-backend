import sessionManager from '../../shared/middleware/sessionManager.js';

/**
 * Frontend Authentication Middleware
 * Validates session cookies and redirects to login page for frontend routes
 */

/**
 * Middleware to authenticate frontend requests using session cookies
 * Redirects to login page for authentication failures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateFrontend = async (req, res, next) => {
  try {
    const sessionData = await sessionManager.validateSession(req);
    
    if (!sessionData) {
      // Redirect to login page with return URL
      const returnUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/login?returnUrl=${returnUrl}`);
    }

    // Attach user context to request object
    req.user = {
      id: sessionData.userId,
      sessionId: sessionData.sessionId,
      authenticated: true
    };

    next();
  } catch (error) {
    console.error('Frontend authentication error:', error);
    // On error, redirect to login page
    return res.redirect('/login?error=auth_error&message=Authentication error occurred');
  }
};

/**
 * Middleware to require authentication for frontend routes
 * This is an alias for authenticateFrontend for better readability
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireFrontendAuth = authenticateFrontend;

/**
 * Middleware to optionally authenticate frontend requests
 * Continues even if authentication fails, but attaches user context if successful
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalFrontendAuth = async (req, res, next) => {
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
    console.error('Optional frontend authentication error:', error);
    req.user = {
      id: null,
      sessionId: null,
      authenticated: false
    };
    next();
  }
};

/**
 * Middleware to redirect authenticated users away from login page
 * Useful for login routes to prevent authenticated users from seeing login form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const redirectIfAuthenticated = async (req, res, next) => {
  try {
    const sessionData = await sessionManager.validateSession(req);
    
    if (sessionData) {
      // User is authenticated, redirect to dashboard
      const returnUrl = req.query.returnUrl || '/';
      return res.redirect(decodeURIComponent(returnUrl));
    }

    // User is not authenticated, continue to login page
    next();
  } catch (error) {
    console.error('Redirect check error:', error);
    // On error, continue to login page
    next();
  }
};

/**
 * Middleware to handle frontend errors and serve HTML error pages
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

  // Log error for debugging
  console.error('Frontend Error:', err);

  // Generate appropriate HTML error page based on error type
  let statusCode = 500;
  let title = 'Internal Server Error';
  let message = 'An unexpected error occurred';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    title = 'Bad Request';
    message = 'The request was invalid';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    title = 'Authentication Required';
    message = 'Please log in to access this page';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    title = 'Access Forbidden';
    message = 'You do not have permission to access this page';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    title = 'Page Not Found';
    message = 'The requested page was not found';
  }

  const errorHTML = generateErrorHTML(title, message);
  return res.status(statusCode).send(errorHTML);
};

/**
 * Generate error HTML page
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {string} HTML content
 */
function generateErrorHTML(title, message) {
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
    <div class="error-container">
        <div class="error-content">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(message)}</p>
            <div class="error-actions">
                <a href="/login" class="btn">Go to Login</a>
                <a href="/" class="btn btn-secondary">Go to Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  authenticateFrontend,
  requireFrontendAuth,
  optionalFrontendAuth,
  redirectIfAuthenticated,
  frontendErrorHandler
};