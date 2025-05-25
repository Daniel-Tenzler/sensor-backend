import express from 'express';
import { getSensorReadings } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';

const router = express.Router();

// Authentication endpoint
router.post('/', validateSecret, (req, res) => {
    // If we get here, authentication was successful (handled by validateSecret)
    res.redirect('/');
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