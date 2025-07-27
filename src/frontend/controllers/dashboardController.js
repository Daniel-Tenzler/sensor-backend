import sessionManager from '../../shared/middleware/sessionManager.js';
import {
    FrontendError,
    FrontendAuthError,
    FRONTEND_ERROR_TYPES,
    escapeHtml
} from '../utils/errorHandler.js';

/**
 * Generate dashboard HTML page
 * @param {string} userId - Current user ID
 * @returns {string} HTML content
 */
function generateDashboardHTML(userId) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sensor Dashboard</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <div class="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>Sensor Dashboard</h1>
                <div class="user-info">
                    <span class="user-name">Welcome, ${escapeHtml(userId)}</span>
                    <form method="POST" action="/logout" class="logout-form">
                        <button type="submit" class="logout-btn">Logout</button>
                    </form>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="dashboard-main">
            <!-- Sensor Submission Form -->
            <section class="sensor-form-section">
                <div class="card">
                    <h2>Submit Sensor Reading</h2>
                    <form id="sensorForm" class="sensor-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sensorId">Sensor ID:</label>
                                <input type="text" id="sensorId" name="sensorId" required 
                                       placeholder="e.g., SENSOR_001">
                            </div>
                            <div class="form-group">
                                <label for="humidity">Humidity (%):</label>
                                <input type="number" id="humidity" name="humidity" 
                                       min="0" max="100" step="0.1" required
                                       placeholder="e.g., 65.5">
                            </div>
                            <div class="form-group">
                                <label for="temperature">Temperature (°C):</label>
                                <input type="number" id="temperature" name="temperature" 
                                       min="-50" max="100" step="0.1" required
                                       placeholder="e.g., 23.5">
                            </div>
                        </div>
                        <button type="submit" class="submit-btn">Submit Reading</button>
                    </form>
                    <div id="submitMessage" class="message"></div>
                </div>
            </section>

            <!-- Sensor Readings Display -->
            <section class="readings-section">
                <div class="card">
                    <div class="readings-header">
                        <h2>Recent Sensor Readings</h2>
                        <div class="readings-controls">
                            <button id="refreshBtn" class="refresh-btn">Refresh</button>
                            <select id="limitSelect" class="limit-select">
                                <option value="10">Last 10</option>
                                <option value="25">Last 25</option>
                                <option value="50" selected>Last 50</option>
                                <option value="100">Last 100</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="loadingIndicator" class="loading-indicator">
                        <div class="spinner"></div>
                        <span>Loading readings...</span>
                    </div>
                    
                    <div id="readingsContainer" class="readings-container">
                        <!-- Readings will be loaded here dynamically -->
                    </div>
                    
                    <div id="errorMessage" class="error-message" style="display: none;">
                        <!-- Error messages will appear here -->
                    </div>
                </div>
            </section>
        </main>
    </div>

    <script src="/js/dashboard.js"></script>
</body>
</html>`;
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