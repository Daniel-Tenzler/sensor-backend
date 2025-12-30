import { insertSensorReading, getLatestReadings } from '../../services/sensorService.js';
import {
  SensorError,
  ValidationError,
  DatabaseError,
  NotFoundError
} from '../utils/errorHandler.js';

/**
 * API Sensor Controller
 * Handles sensor-related endpoints with JSON-only responses
 */

/**
 * Validate sensor reading input
 * @param {string} sensorId - Sensor identifier
 * @param {number} humidity - Humidity value
 * @param {number} temperature - Temperature value
 * @throws {ValidationError|SensorError} If validation fails
 */
const validateSensorReading = (sensorId, humidity, temperature) => {
  if (!sensorId || typeof sensorId !== 'string') {
    throw new ValidationError('Invalid sensor ID format', { field: 'sensorId', type: 'string' });
  }

  if (sensorId.trim().length === 0) {
    throw new ValidationError('Sensor ID cannot be empty', { field: 'sensorId' });
  }

  if (humidity === undefined || humidity === null) {
    throw new ValidationError('Humidity value is required', { field: 'humidity' });
  }

  if (temperature === undefined || temperature === null) {
    throw new ValidationError('Temperature value is required', { field: 'temperature' });
  }

  const humidityNum = Number(humidity);
  const temperatureNum = Number(temperature);

  if (isNaN(humidityNum) || isNaN(temperatureNum)) {
    throw new ValidationError('Sensor values must be valid numbers', {
      fields: ['humidity', 'temperature'],
      provided: { humidity, temperature }
    });
  }

  // Additional validation for reasonable ranges
  if (humidityNum < 0 || humidityNum > 100) {
    throw new SensorError('Humidity must be between 0 and 100', 400);
  }

  if (temperatureNum < -50 || temperatureNum > 100) {
    throw new SensorError('Temperature must be between -50 and 100 degrees', 400);
  }
};

/**
 * Submit sensor reading endpoint - JSON only response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const submitSensorReading = async (req, res) => {
  try {
    // Extract sensor data, ignoring 'secret' field if present (used for Bearer token auth)
    const { sensorId, humidity, temperature, ...rest } = req.body;
    console.log(rest);

    // Validate input
    validateSensorReading(sensorId, humidity, temperature);

    // Convert to numbers for database insertion
    const humidityNum = Number(humidity);
    const temperatureNum = Number(temperature);

    // Insert the reading using the service
    const result = await insertSensorReading(sensorId, humidityNum, temperatureNum);

    if (!result.success) {
      throw new DatabaseError('Failed to insert sensor reading');
    }

    res.status(201).json({
      success: true,
      message: 'Sensor reading recorded successfully',
      data: {
        id: result.id,
        sensorId: sensorId,
        humidity: humidityNum,
        temperature: temperatureNum,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sensor reading error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Let the error middleware handle the error
    throw error;
  }
};

/**
 * Get sensor readings endpoint - JSON only response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSensorReadingsAPI = async (req, res) => {
  try {
    // Get limit from query parameters, default to 100
    const limit = parseInt(req.query.limit) || 100;

    // Validate limit
    if (limit < 1 || limit > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000', {
        field: 'limit',
        value: limit,
        range: { min: 1, max: 1000 }
      });
    }

    // Get the readings using the service
    const readings = await getLatestReadings(limit);

    if (!readings) {
      throw new DatabaseError('Invalid response from database');
    }

    // Format the response
    const formattedReadings = readings.map((reading) => ({
      id: reading.id,
      sensorId: reading.sensor_id,
      humidity: reading.humidity,
      temperature: reading.temperature,
      timestamp: reading.timestamp
    }));

    res.status(200).json({
      success: true,
      message: `Retrieved ${formattedReadings.length} sensor readings`,
      data: {
        readings: formattedReadings,
        count: formattedReadings.length,
        limit: limit
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving sensor readings:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Let the error middleware handle the error
    throw error;
  }
};

/**
 * Get sensor statistics endpoint - JSON only response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSensorStats = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    if (!sensorId) {
      throw new ValidationError('Sensor ID parameter is required', { field: 'sensorId' });
    }

    // Get readings for specific sensor
    const allReadings = await getLatestReadings(1000); // Get more for stats
    const sensorReadings = allReadings
      .filter((reading) => reading.sensor_id === sensorId)
      .slice(0, limit);

    if (sensorReadings.length === 0) {
      throw new NotFoundError(`No readings found for sensor ${sensorId}`);
    }

    // Calculate statistics
    const temperatures = sensorReadings.map((r) => r.temperature);
    const humidities = sensorReadings.map((r) => r.humidity);

    const stats = {
      sensorId: sensorId,
      readingCount: sensorReadings.length,
      temperature: {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        avg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length
      },
      humidity: {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((a, b) => a + b, 0) / humidities.length
      },
      latestReading: sensorReadings[0],
      oldestReading: sensorReadings[sensorReadings.length - 1]
    };

    res.status(200).json({
      success: true,
      message: `Statistics for sensor ${sensorId}`,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving sensor statistics:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Let the error middleware handle the error
    throw error;
  }
};

export default {
  submitSensorReading,
  getSensorReadingsAPI,
  getSensorStats
};
