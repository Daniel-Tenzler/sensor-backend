import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import apiRoutes from './api/routes/index.js';
import frontendRoutes from './frontend/routes/index.js';
import sessionManager, { sessionConfig } from './shared/middleware/sessionManager.js';
import {
  configureStaticAssets,
  securityHeaders,
  serveFavicon
} from './shared/middleware/staticAssets.js';
import deflateDecompression from './api/middleware/deflateDecompression.js';
import sensorController from './api/controllers/sensorController.js';
import { requireAPIAuth } from './api/middleware/apiAuth.js';
import { asyncHandler } from './api/middleware/errorHandler.js';

const app = express();

// Security headers middleware
app.use(securityHeaders());

// trust first proxy (Render)
app.set('trust proxy', 1);

// Favicon middleware
app.use(serveFavicon());

// Static asset serving middleware with caching
app.use(configureStaticAssets());

// Deflate decompression middleware (must be before express.json)
app.use(deflateDecompression);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form data
app.use(cookieParser());

// Session middleware with secure configuration
app.use(session(sessionConfig));

// Schedule session cleanup every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
setInterval(async () => {
  try {
    const cleanupResult = await sessionManager.cleanupExpiredSessions();
    console.log(`Session cleanup completed at ${new Date().toISOString()}`);
    if (cleanupResult && cleanupResult.deletedCount !== undefined) {
      console.log(`   Cleaned up ${cleanupResult.deletedCount} expired sessions`);
    }
  } catch (error) {
    console.error(`Session cleanup failed at ${new Date().toISOString()}:`, error.message);
  }
}, CLEANUP_INTERVAL);

// Sensor device submission endpoint (before API routes to match /submit path)
// This endpoint accepts Bearer token authentication for sensor devices
app.post('/submit', requireAPIAuth, asyncHandler(sensorController.submitSensorReading));

// API Routes (JSON responses only)
app.use('/api', apiRoutes);

// Frontend Routes (HTML responses)
app.use('/', frontendRoutes);

app.listen(config.PORT, () => {
  console.log('Sensor Backend Server Started');
  console.log(`Server running on: http://localhost:${config.PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('─'.repeat(50));
});
