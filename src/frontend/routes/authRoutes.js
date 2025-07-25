import express from 'express';
import frontendAuthController from '../controllers/authController.js';
import { redirectIfAuthenticated, frontendErrorHandler } from '../middleware/frontendAuth.js';

const router = express.Router();

/**
 * Frontend Authentication Routes
 * All routes serve HTML responses
 */

// GET /login - Serve login form (redirect if already authenticated)
router.get('/login', redirectIfAuthenticated, frontendAuthController.getLogin);

// POST /login - Process login form submission
router.post('/login', redirectIfAuthenticated, frontendAuthController.processLogin);

// POST /logout - Handle logout and redirect
router.post('/logout', frontendAuthController.logout);

// Apply frontend error handler to all auth routes
router.use(frontendErrorHandler);

export default router;