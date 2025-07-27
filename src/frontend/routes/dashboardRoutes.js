import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { requireFrontendAuth } from '../middleware/frontendAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Frontend Dashboard Routes
 */

// GET / - Serve main dashboard page (requires authentication)
router.get('/', requireFrontendAuth, asyncHandler(dashboardController.getDashboard));

export default router;