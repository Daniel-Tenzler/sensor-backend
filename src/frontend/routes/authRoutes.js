import express from 'express';
import frontendAuthController from '../controllers/authController.js';
import { redirectIfAuthenticated } from '../middleware/frontendAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Frontend Authentication Routes
 * All routes serve HTML responses
 */

// GET /login - Serve login form (redirect if already authenticated)
router.get('/login', redirectIfAuthenticated, asyncHandler(frontendAuthController.getLogin));

// POST /login - Process login form submission
router.post('/login', redirectIfAuthenticated, asyncHandler(frontendAuthController.processLogin));

// POST /logout - Handle logout and redirect
router.post('/logout', asyncHandler(frontendAuthController.logout));

export default router;