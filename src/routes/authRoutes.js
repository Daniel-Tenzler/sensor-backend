import express from 'express';
import { getSensorData } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';

const router = express.Router();

router.get('/', validateSecret, getSensorData);

export default router;