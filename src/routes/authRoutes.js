import express from 'express';
import { getSensorReadings } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';
import { sha256 } from '../utils/hash.js';
import config from '../config/index.js';

const router = express.Router();

// Authentication endpoint
router.post('/', (req, res) => {
    const userSecret = req.body.secret;
    const expectedSecretHash = sha256(config.SECRET_KEY);
    const userSecretHash = userSecret ? sha256(userSecret) : null;

    if (userSecretHash === expectedSecretHash) {
        req.session.authenticated = true;
        res.redirect('/');
    } else {
        res.redirect('/');
    }
});

// Protected route for getting sensor readings
router.get('/', validateSecret, getSensorReadings);

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.redirect('/');
    });
});

export default router;