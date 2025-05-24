import express from 'express';
import { getSensorReadings } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';

const router = express.Router();

router.get('/', validateSecret, getSensorReadings);

export default router;