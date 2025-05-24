import express from 'express';
import { submitSensorReading, getSensorReadings } from '../controllers/sensorController.js';
import { SECRET_KEY } from '../config/app.js';
import { verifySecret } from '../utils/auth.js';

const router = express.Router();

// Middleware to verify secret key for POST requests
const verifySecretMiddleware = (req, res, next) => {
    const { secret } = req.body;
    if (!verifySecret(secret, SECRET_KEY)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

router.post('/submit', verifySecretMiddleware, submitSensorReading);
router.get('/', getSensorReadings);

export default router;