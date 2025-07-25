import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import sensorRoutes from './routes/sensorRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sessionConfig } from './shared/middleware/sessionManager.js';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form data
app.use(cookieParser());

// Session middleware with secure configuration
app.use(session(sessionConfig));

// Routes
app.use('/', authRoutes);
app.use('/', sensorRoutes);

// Error handling
app.use(errorHandler);

app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});