import express from 'express';
import authController from '../controllers/authController.js';
import { optionalAPIAuth } from '../middleware/apiAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * API Authentication Routes
 * All routes under /api/auth
 */

// POST /api/auth/login - Login endpoint
router.post('/login', asyncHandler(authController.login));

// POST /api/auth/logout - Logout endpoint (requires authentication)
router.post('/logout', asyncHandler(authController.logout));

// GET /api/auth/status - Get session status (optional auth to check current status)
router.get('/status', optionalAPIAuth, asyncHandler(authController.getSessionStatus));

export default router;