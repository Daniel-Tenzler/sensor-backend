import express from 'express';
import session from 'express-session';
import process from 'process';
import config from './config/index.js';
import sensorRoutes from './routes/sensorRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Session configuration
app.use(session({
    secret: config.SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Added sameSite option
    },
    name: 'sessionId' // Added explicit session name
}));

// Add session debugging middleware
app.use((req, res, next) => {
    console.log('Session Debug - Request:', {
        sessionID: req.sessionID,
        session: req.session,
        cookies: req.cookies
    });
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form data

// Routes
app.use('/', authRoutes);
app.use('/', sensorRoutes);

// Error handling
app.use(errorHandler);

app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});