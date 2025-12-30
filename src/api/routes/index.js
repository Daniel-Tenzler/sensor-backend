import express from 'express';
import authRoutes from './authRoutes.js';
import sensorRoutes from './sensorRoutes.js';
import { apiErrorHandler, apiNotFoundHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Main API Router
 * Combines all API routes under /api prefix
 */

// Mount auth routes at /api/auth
router.use('/auth', authRoutes);

// Mount sensor routes at /api/sensors
router.use('/sensors', sensorRoutes);

// Global API error handler for any unhandled errors
router.use(apiErrorHandler);

// Handle 404 for API routes
router.use('*', apiNotFoundHandler);

export default router;