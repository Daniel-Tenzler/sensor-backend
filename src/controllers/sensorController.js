import getDatabase from '../db/database.js';
import { hashSecret } from '../utils/auth.js';
import { SECRET_KEY } from '../config/app.js';
import { promisify } from 'util';

// Custom error class for sensor-related errors
class SensorError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'SensorError';
        this.statusCode = statusCode;
    }
}

// Validate database connection
const validateDatabaseConnection = async() => {
    try {
        const db = await getDatabase();
        if (!db) {
            throw new SensorError('Database connection not available', 503);
        }
        // Test the connection with a simple query
        await promisify(db.get.bind(db))('SELECT 1');
    } catch (error) {
        console.error('Database connection test failed:', error);
        throw new SensorError('Database connection test failed: ' + error.message, 503);
    }
};

// Validate sensor reading input
const validateSensorReading = (sensorId, value) => {
    if (!sensorId || typeof sensorId !== 'string') {
        throw new SensorError('Invalid sensor ID format', 400);
    }
    if (value === undefined || value === null) {
        throw new SensorError('Sensor value is required', 400);
    }
    if (isNaN(Number(value))) {
        throw new SensorError('Sensor value must be a number', 400);
    }
};

export const submitSensorReading = async(req, res) => {
    try {
        const { sensorId, value, secret } = req.body;

        // Verify the secret matches the expected hash
        const expectedHash = hashSecret(SECRET_KEY);
        const providedHash = hashSecret(secret);

        if (providedHash !== expectedHash) {
            throw new SensorError('Unauthorized access', 403);
        }

        // Validate input
        validateSensorReading(sensorId, value);

        // Validate database connection
        await validateDatabaseConnection();

        // Get database instance and run query
        const db = await getDatabase();

        function runAsync(db, sql, params = []) {
            return new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID });
                });
            });
        }

        const result = await runAsync(db, 'INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)', [sensorId, value]);

        if (!result.lastID) {
            throw new SensorError('Failed to insert sensor reading', 500);
        }


        res.json({
            success: true,
            id: result.lastID,
            message: 'Sensor reading recorded successfully'
        });
    } catch (error) {
        console.error('Sensor reading error:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        if (error instanceof SensorError) {
            return res.status(error.statusCode).json({
                error: error.message,
                type: error.name
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred while processing the sensor reading'
        });
    }
};

export const getSensorReadings = async(req, res) => {
    try {
        const db = await getDatabase();
        const rows = await db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100');

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error retrieving sensor readings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve sensor readings'
        });
    }
};