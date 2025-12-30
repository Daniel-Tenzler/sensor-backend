import express from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import { frontendErrorHandler, frontendNotFoundHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Main Frontend Router
 * Combines all frontend routes for HTML serving
 */

// Mount auth routes (login, logout)
router.use('/', authRoutes);

// Mount dashboard routes (main dashboard)
router.use('/', dashboardRoutes);

// Handle 404 for frontend routes
router.use('*', frontendNotFoundHandler);

// Global frontend error handler for any unhandled errors
router.use(frontendErrorHandler);

export default router;