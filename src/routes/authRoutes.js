import express from 'express';
import { getSensorReadings } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';
import { sha256 } from '../utils/hash.js';
import config from '../config/index.js';

const router = express.Router();

// Authentication endpoint
router.post('/login', async(req, res) => {
    console.log('POST /login called');
    console.log('Request body:', req.body);

    const userSecret = req.body.secret;
    if (!userSecret) {
        console.log('No secret provided');
        return res.status(400).json({ error: 'Secret key is required' });
    }

    const expectedSecretHash = sha256(config.SECRET_KEY);
    const userSecretHash = sha256(userSecret);

    console.log('User secret hash:', userSecretHash);
    console.log('Expected secret hash:', expectedSecretHash);

    if (userSecretHash === expectedSecretHash) {
        // Return the secret as a token
        res.json({ token: userSecret });
    } else {
        console.log('Authentication failed - invalid secret');
        res.status(401).json({ error: 'Invalid secret key' });
    }
});

// Protected route for getting sensor readings
router.get('/', validateSecret, getSensorReadings);

// Logout endpoint (client-side only, just needs to clear sessionStorage)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;