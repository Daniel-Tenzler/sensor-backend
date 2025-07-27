import sessionManager from '../../shared/middleware/sessionManager.js';
import { 
  FrontendError, 
  FrontendAuthError, 
  FrontendValidationError,
  FRONTEND_ERROR_TYPES,
  escapeHtml 
} from '../utils/errorHandler.js';
import { sessionConfig } from '../../config/session.js';




/**
 * Authenticate user (internal method)
 * This method now uses proper session-based authentication
 * @param {string} secret - Secret key (deprecated parameter, kept for compatibility)
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Authentication result
 */
async function authenticateUser(secret, req) {
  try {
    // Validate secret against SESSION_SECRET from environment
    if (!secret || secret.trim() !== sessionConfig.secret) {
      return {
        success: false,
        message: 'Invalid credentials provided'
      };
    }

    // Create session for authenticated user
    const userId = 'sensor-user';
    const sessionId = await sessionManager.createSession(userId, req);
    return {
      success: true,
      message: 'Login successful',
      sessionId
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed due to server error'
    };
  }
}

/**
 * Generate login HTML page
 * @param {string} error - Error type
 * @param {string} message - Error or success message
 * @returns {string} HTML content
 */
function generateLoginHTML(error = null, message = null) {
  const errorDisplay = error && message ? 
    `<div class="alert alert-error">${escapeHtml(message)}</div>` : '';
  
  const successDisplay = !error && message ? 
    `<div class="alert alert-success">${escapeHtml(message)}</div>` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sensor Dashboard</title>
    <link rel="stylesheet" href="/css/login.css">
</head>
<body>
    <div class="login-container">
        <div class="login-form">
            <h1>Sensor Dashboard</h1>
            <h2>Login</h2>
            
            ${errorDisplay}
            ${successDisplay}
            
            <form method="POST" action="/login" id="loginForm">
                <div class="form-group">
                    <label for="secret">Secret Key:</label>
                    <input type="password" id="secret" name="secret" required 
                           placeholder="Enter your secret key">
                </div>
                
                <button type="submit" class="login-btn">Login</button>
            </form>
            
            <div class="login-info">
                <p>Enter your secret key to access the sensor dashboard</p>
            </div>
        </div>
    </div>
    
    <script src="/js/login.js"></script>
</body>
</html>`;
}

/**
 * Generate error HTML page
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {string} HTML content
 */




/**
 * Frontend Authentication Controller
 * Handles HTML-based authentication flows including login forms and logout
 */
class FrontendAuthController {
  /**
   * Serve the login HTML form
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLogin(req, res) {
    try {
      // If user is already authenticated, redirect to dashboard
      if (sessionManager.isAuthenticated(req)) {
        return res.redirect('/');
      }

      // Get error message from query params if present
      const error = req.query.error;
      const message = req.query.message;

      // Serve login HTML page
      const loginHTML = generateLoginHTML(error, message);
      res.setHeader('Content-Type', 'text/html');
      res.send(loginHTML);
    } catch {
      throw new FrontendError('Unable to load login page', FRONTEND_ERROR_TYPES.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Process login form submission
   * This method handles the form POST and calls the API endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processLogin(req, res) {
    try {
      const { secret } = req.body;

      // Validate input
      if (!secret) {
        throw new FrontendValidationError('Secret is required');
      }

      // Make internal API call to authenticate
      const authResult = await authenticateUser(secret, req);

      if (authResult.success) {
        // Get return URL from query params or default to dashboard
        const returnUrl = req.query.returnUrl || '/';
        res.redirect(decodeURIComponent(returnUrl));
      } else {
        // Throw authentication error
        throw new FrontendAuthError(authResult.message);
      }
    } catch (error) {
      // Re-throw custom errors to be handled by error middleware
      if (error instanceof FrontendValidationError || error instanceof FrontendAuthError) {
        throw error;
      }
      
      // Wrap other errors
      throw new FrontendError('Login failed due to server error', FRONTEND_ERROR_TYPES.INTERNAL_ERROR, 500);
    }
  }

  /**
   * Handle logout
   * Clears session and redirects to login page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // Destroy the session
      await sessionManager.destroySession(req, res);
      
      // Redirect to login page with success message
      res.redirect('/login?message=Successfully logged out');
    } catch (error) {
      // For logout, we still want to redirect to login even if there's an error
      // since from the user's perspective, they should be logged out
      console.warn('Logout error (non-critical):', error.message);
      res.redirect('/login?message=Logout completed');
    }
  }


}

export default new FrontendAuthController();