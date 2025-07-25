import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { requireAPIAuth, apiErrorHandler } from '../middleware/apiAuth.js';

const router = express.Router();

/**
 * API Sensor Routes
 * All routes under /api/sensors
 * All routes require authentication
 */

// POST /api/sensors/submit - Submit sensor reading (requires authentication)
router.post('/submit', requireAPIAuth, sensorController.submitSensorReading);

// GET /api/sensors/readings - Get sensor readings (requires authentication)
router.get('/readings', requireAPIAuth, sensorController.getSensorReadingsAPI);

// GET /api/sensors/stats/:sensorId - Get sensor statistics (requires authentication)
router.get('/stats/:sensorId', requireAPIAuth, sensorController.getSensorStats);

// Apply API error handler to all sensor routes
router.use(apiErrorHandler);

export default router;