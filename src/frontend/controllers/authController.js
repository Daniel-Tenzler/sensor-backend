import path from 'path';
import { fileURLToPath } from 'url';
import sessionManager from '../../shared/middleware/sessionManager.js';

const __filename = fileURLToPath(import.meta.url);


/**
 * Authenticate user (internal method)
 * This simulates the API authentication logic using secret-based auth
 * @param {string} secret - Secret key
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Authentication result
 */
async function authenticateUser(secret, req) {
  try {
    // Import auth utilities and config
    const { hashSecret } = await import('../../utils/auth.js');
    const { SECRET_KEY } = await import('../../config/app.js');
    
    // Verify the secret matches the expected hash
    const expectedHash = hashSecret(SECRET_KEY);
    const providedHash = hashSecret(secret);
    
    if (providedHash === expectedHash) {
      // Create session for authenticated user
      const userId = 'sensor-user';
      const sessionId = await sessionManager.createSession(userId, req);
      return {
        success: true,
        message: 'Login successful',
        sessionId
      };
    } else {
      return {
        success: false,
        message: 'Invalid secret key'
      };
    }
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
function generateErrorHTML(title, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Sensor Dashboard</title>
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
    } catch (error) {
      console.error('Error serving login page:', error);
      res.status(500).send(generateErrorHTML('Internal Server Error', 'Unable to load login page'));
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
        return res.redirect('/login?error=missing_credentials&message=Secret is required');
      }

      // Make internal API call to authenticate
      const authResult = await authenticateUser(secret, req);

      if (authResult.success) {
        // Get return URL from query params or default to dashboard
        const returnUrl = req.query.returnUrl || '/';
        res.redirect(decodeURIComponent(returnUrl));
      } else {
        // Redirect back to login with error
        res.redirect(`/login?error=auth_failed&message=${encodeURIComponent(authResult.message)}`);
      }
    } catch (error) {
      console.error('Error processing login:', error);
      res.redirect('/login?error=server_error&message=Login failed due to server error');
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
      console.error('Error during logout:', error);
      res.redirect('/login?error=logout_error&message=Error occurred during logout');
    }
  }


}

export default new FrontendAuthController();