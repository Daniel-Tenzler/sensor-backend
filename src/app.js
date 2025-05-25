import express from 'express';
import config from './config/index.js';
import sensorRoutes from './routes/sensorRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

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