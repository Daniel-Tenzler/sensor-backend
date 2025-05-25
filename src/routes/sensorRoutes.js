import express from 'express';
import { submitSensorReading } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';

const router = express.Router();

// All sensor routes are protected with session-based authentication
router.post('/submit', validateSecret, submitSensorReading);

export default router;