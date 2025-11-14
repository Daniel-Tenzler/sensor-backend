import session from 'express-session';
import crypto from 'crypto';
import process from 'process';

/**
 * SessionManager - Handles session creation, validation, and cleanup
 */
class SessionManager {
  constructor() {
    this.sessionStore = null;
    this.sessionConfig = this.getSessionConfig();
  }

  /**
   * Get session configuration with secure cookie settings
   * @returns {Object} Session configuration object
   */
  getSessionConfig() {
    return {
      secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
      name: 'sensor.session',
      cookie: {
        httpOnly: true,
        // Secure cookies only work over HTTPS
        // In development (HTTP), set to false; in production (HTTPS), set to true
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      },
      resave: false,
      saveUninitialized: false,
      rolling: true // Reset expiration on activity
    };
  }

  /**
   * Get configured express-session middleware
   * @returns {Function} Express session middleware
   */
  getSessionMiddleware() {
    return session(this.sessionConfig);
  }

  /**
   * Create a new session for a user
   * @param {string} userId - User identifier
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<string>} Session ID
   */
  async createSession(userId, req) {
    return new Promise((resolve, reject) => {
      req.session.userId = userId;
      req.session.createdAt = new Date();
      req.session.isActive = true;

      req.session.save((err) => {
        if (err) {
          reject(new Error(`Failed to create session: ${err.message}`));
        } else {
          resolve(req.session.id);
        }
      });
    });
  }

  /**
   * Validate an existing session
   * @param {Object} req - Express request object
   * @returns {Promise<Object|null>} Session data or null if invalid
   */
  async validateSession(req) {
    return new Promise((resolve) => {
      if (!req.session || !req.session.userId || !req.session.isActive) {
        resolve(null);
        return;
      }

      // Check if session has expired
      const now = new Date();
      const createdAt = new Date(req.session.createdAt);
      const maxAge = this.sessionConfig.cookie.maxAge;

      if (now - createdAt > maxAge) {
        this.destroySession(req, null);
        resolve(null);
        return;
      }

      resolve({
        sessionId: req.session.id,
        userId: req.session.userId,
        createdAt: req.session.createdAt,
        isActive: req.session.isActive
      });
    });
  }

  /**
   * Destroy a session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object (optional)
   * @returns {Promise<void>}
   */
  async destroySession(req, res) {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        resolve();
        return;
      }

      req.session.destroy((err) => {
        if (err) {
          reject(new Error(`Failed to destroy session: ${err.message}`));
        } else {
          if (res) {
            res.clearCookie(this.sessionConfig.name);
          }
          resolve();
        }
      });
    });
  }

  /**
   * Clean up expired sessions (to be called periodically)
   * Note: This is a basic implementation. In production, you might want
   * to use a more sophisticated cleanup mechanism with the session store
   * @returns {Promise<void>}
   */
  async cleanupExpiredSessions() {
    // This is a placeholder for session cleanup
    // The actual implementation depends on the session store being used
    // For memory store, express-session handles this automatically
    // For persistent stores (Redis, DB), you'd implement store-specific cleanup
    return Promise.resolve();
  }

  /**
   * Check if a user is authenticated based on session
   * @param {Object} req - Express request object
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated(req) {
    return !!(req.session && req.session.userId && req.session.isActive);
  }

  /**
   * Get user ID from session
   * @param {Object} req - Express request object
   * @returns {string|null} User ID or null if not authenticated
   */
  getUserId(req) {
    if (this.isAuthenticated(req)) {
      return req.session.userId;
    }
    return null;
  }

  /**
   * Regenerate session ID (useful for preventing session fixation)
   * @param {Object} req - Express request object
   * @returns {Promise<void>}
   */
  async regenerateSession(req) {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          reject(new Error(`Failed to regenerate session: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
const sessionManager = new SessionManager();

// Export the session configuration for use in app.js
export const sessionConfig = sessionManager.getSessionConfig();

export default sessionManager;
