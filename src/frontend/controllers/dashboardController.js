import sessionManager from '../../shared/middleware/sessionManager.js';
import { FrontendError, FrontendAuthError, FRONTEND_ERROR_TYPES } from '../utils/errorHandler.js';
import viewRenderer from '../utils/viewRenderer.js';

/**
 * Generate dashboard HTML page using view renderer
 * @param {string} userId - Current user ID
 * @returns {string} HTML content
 */
function generateDashboardHTML(userId) {
  const viewData = {
    userId: userId
  };

  return viewRenderer.render('dashboard', viewData);
}

/**
 * Dashboard Frontend Controller
 * Handles serving the sensor readings dashboard HTML page
 */
class DashboardController {
  /**
   * Serve the main dashboard page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboard(req, res) {
    try {
      // Ensure user is authenticated (middleware should handle this, but double-check)
      if (!sessionManager.isAuthenticated(req)) {
        throw new FrontendAuthError('Authentication required to access dashboard');
      }

      const userId = sessionManager.getUserId(req);

      // Serve dashboard HTML page
      const dashboardHTML = generateDashboardHTML(userId);
      res.setHeader('Content-Type', 'text/html');
      res.send(dashboardHTML);
    } catch (error) {
      // Re-throw custom errors to be handled by error middleware
      if (error instanceof FrontendAuthError) {
        throw error;
      }

      // Wrap other errors
      throw new FrontendError('Unable to load dashboard', FRONTEND_ERROR_TYPES.INTERNAL_ERROR, 500);
    }
  }
}

export default new DashboardController();
