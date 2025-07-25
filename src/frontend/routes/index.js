import express from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import { frontendErrorHandler } from '../middleware/frontendAuth.js';

const router = express.Router();

/**
 * Main Frontend Router
 * Combines all frontend routes for HTML serving
 */

// Mount auth routes (login, logout)
router.use('/', authRoutes);

// Mount dashboard routes (main dashboard)
router.use('/', dashboardRoutes);

// Handle 404 for frontend routes - serve custom 404 page
router.use('*', (req, res) => {
  const notFoundHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - Sensor Dashboard</title>
    <link rel="stylesheet" href="/css/error.css">
</head>
<body>
    <div class="error-container">
        <div class="error-content">
            <h1>Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <div class="error-actions">
                <a href="/" class="btn">Go to Dashboard</a>
                <a href="/login" class="btn btn-secondary">Go to Login</a>
            </div>
        </div>
    </div>
</body>
</html>`;

  res.status(404).send(notFoundHTML);
});

// Global frontend error handler for any unhandled errors
router.use(frontendErrorHandler);

export default router;