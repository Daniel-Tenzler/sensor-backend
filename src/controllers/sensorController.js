import db from '../db/database.js';
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
const validateDatabaseConnection = () => {
    if (!db) {
        throw new SensorError('Database connection not available', 503);
    }
    try {
        // Test the connection with a simple query
        db.get('SELECT 1', (err) => {
            if (err) {
                throw new SensorError('Database connection test failed', 503);
            }
        });
    } catch (error) {
        throw new SensorError('Database connection test failed' + error, 503);
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
        validateDatabaseConnection();

        // Convert to promise-based query
        const run = promisify(db.run.bind(db));
        const result = await run('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)', [sensorId, value]);

        if (!result || !result.lastID) {
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
            // Validate database connection
            validateDatabaseConnection();

            const rows = await db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100');

            if (!rows) {
                throw new SensorError('Failed to retrieve sensor readings', 500);
            }

            const tableRows = rows.map(row => {
                try {
                    return `<tr>
                    <td>${escapeHtml(row.id)}</td>
                    <td>${escapeHtml(row.sensor_id)}</td>
                    <td>${escapeHtml(row.value)}</td>
                    <td>${escapeHtml(row.timestamp)}</td>
                </tr>`;
                } catch (error) {
                    console.error('Error formatting row:', error);
                    return ''; // Skip problematic rows
                }
            }).join('');

            res.send(`
        <html>
        <head>
            <title>Sensor Data</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                tr:hover { background-color: #f5f5f5; }
            </style>
        </head>
        <body>
            <h1>Latest Sensor Readings</h1>
            ${rows.length === 0 ? '<p>No sensor readings available</p>' : `
            <table>
                <tr>
                    <th>ID</th>
                    <th>Sensor ID</th>
                    <th>Value</th>
                    <th>Timestamp</th>
                </tr>
                ${tableRows}
            </table>`}
        </body>
        </html>
        `);
    } catch (error) {
        console.error('Error retrieving sensor readings:', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        if (error instanceof SensorError) {
            return res.status(error.statusCode).send(`
                <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error</h1>
                    <p>${escapeHtml(error.message)}</p>
                </body>
                </html>
            `);
        }

        res.status(500).send(`
            <html>
            <head><title>Error</title></head>
            <body>
                <h1>Internal Server Error</h1>
                <p>An unexpected error occurred while retrieving sensor readings.</p>
            </body>
            </html>
        `);
    }
};

// Helper function to prevent XSS attacks
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}