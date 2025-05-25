import express from 'express';
import { getSensorReadings } from '../controllers/sensorController.js';
import { validateSecret } from '../middleware/validateSecret.js';
import { sha256 } from '../utils/hash.js';
import config from '../config/index.js';

const router = express.Router();

// Authentication endpoint
router.post('/', async(req, res) => {
    console.log('POST / called');
    console.log('Request body:', req.body);
    console.log('Current session:', req.session);

    const userSecret = req.body.secret;
    if (!userSecret) {
        console.log('No secret provided');
        return res.redirect('/');
    }

    const expectedSecretHash = sha256(config.SECRET_KEY);
    const userSecretHash = sha256(userSecret);

    console.log('User secret hash:', userSecretHash);
    console.log('Expected secret hash:', expectedSecretHash);

    if (userSecretHash === expectedSecretHash) {
        // Set session and ensure it's saved
        req.session.authenticated = true;
        req.session.userSecret = userSecretHash; // Store the hash for verification

        // Force session save
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).send('Authentication failed');
            }
            console.log('Session saved successfully:', req.session);
            // Set a cookie to help with debugging
            res.cookie('auth_debug', 'true', { httpOnly: true });
            res.redirect('/');
        });
    } else {
        console.log('Authentication failed - invalid secret');
        res.redirect('/');
    }
});

// Protected route for getting sensor readings
router.get('/', validateSecret, getSensorReadings);

// Logout endpoint
router.post('/logout', (req, res) => {
    console.log('POST /logout called');
    console.log('Session before logout:', req.session);
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        console.log('Session destroyed.');
        res.clearCookie('sessionId');
        res.clearCookie('auth_debug');
        res.redirect('/');
    });
});

export default router;