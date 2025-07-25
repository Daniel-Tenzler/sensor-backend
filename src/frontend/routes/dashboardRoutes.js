import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { requireFrontendAuth, frontendErrorHandler } from '../middleware/frontendAuth.js';

const router = express.Router();

/**
 * Frontend Dashboard Routes
 * All routes serve HTML responses and require authentication
 */

// GET / - Serve main dashboard page (requires authentication)
router.get('/', requireFrontendAuth, dashboardController.getDashboard);

// Apply frontend error handler to all dashboard routes
router.use(frontendErrorHandler);

export default router;