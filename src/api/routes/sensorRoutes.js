import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { requireAPIAuth } from '../middleware/apiAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * API Sensor Routes
 * All routes under /api/sensors
 * All routes require authentication
 */

// POST /api/sensors/submit - Submit sensor reading (requires authentication)
router.post('/submit', requireAPIAuth, asyncHandler(sensorController.submitSensorReading));

// GET /api/sensors/readings - Get sensor readings (requires authentication)
router.get('/readings', requireAPIAuth, asyncHandler(sensorController.getSensorReadingsAPI));

// GET /api/sensors/stats/:sensorId - Get sensor statistics (requires authentication)
router.get('/stats/:sensorId', requireAPIAuth, asyncHandler(sensorController.getSensorStats));

export default router;