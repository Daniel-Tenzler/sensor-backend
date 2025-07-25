import { insertSensorReading, getLatestReadings } from '../../services/sensorService.js';
import { createAPIError } from '../middleware/apiAuth.js';

/**
 * API Sensor Controller
 * Handles sensor-related endpoints with JSON-only responses
 */

/**
 * Custom error class for sensor-related errors
 */
class SensorError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'SensorError';
    this.statusCode = statusCode;
  }
}

/**
 * Validate sensor reading input
 * @param {string} sensorId - Sensor identifier
 * @param {number} humidity - Humidity value
 * @param {number} temperature - Temperature value
 * @throws {SensorError} If validation fails
 */
const validateSensorReading = (sensorId, humidity, temperature) => {
  if (!sensorId || typeof sensorId !== 'string') {
    throw new SensorError('Invalid sensor ID format', 400);
  }
  
  if (sensorId.trim().length === 0) {
    throw new SensorError('Sensor ID cannot be empty', 400);
  }
  
  if (humidity === undefined || humidity === null) {
    throw new SensorError('Humidity value is required', 400);
  }
  
  if (temperature === undefined || temperature === null) {
    throw new SensorError('Temperature value is required', 400);
  }
  
  const humidityNum = Number(humidity);
  const temperatureNum = Number(temperature);
  
  if (isNaN(humidityNum) || isNaN(temperatureNum)) {
    throw new SensorError('Sensor values must be valid numbers', 400);
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
    const { sensorId, humidity, temperature } = req.body;

    // Validate input
    validateSensorReading(sensorId, humidity, temperature);

    // Convert to numbers for database insertion
    const humidityNum = Number(humidity);
    const temperatureNum = Number(temperature);

    // Insert the reading using the service
    const result = await insertSensorReading(sensorId, humidityNum, temperatureNum);

    if (!result.success) {
      throw new SensorError('Failed to insert sensor reading', 500);
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

    if (error instanceof SensorError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: 'SENSOR_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Handle database errors
    if (error.message.includes('database') || error.message.includes('query')) {
      return res.status(500).json({
        success: false,
        error: 'Database error',
        code: 'DATABASE_ERROR',
        message: 'Failed to save sensor reading to database',
        timestamp: new Date().toISOString()
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing the sensor reading',
      timestamp: new Date().toISOString()
    });
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
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter',
        code: 'VALIDATION_ERROR',
        message: 'Limit must be between 1 and 1000',
        timestamp: new Date().toISOString()
      });
    }

    // Get the readings using the service
    const readings = await getLatestReadings(limit);

    if (!readings) {
      throw new SensorError('Invalid response from database', 500);
    }

    // Format the response
    const formattedReadings = readings.map(reading => ({
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

    if (error instanceof SensorError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: 'SENSOR_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Handle database errors
    if (error.message.includes('database') || error.message.includes('query')) {
      return res.status(500).json({
        success: false,
        error: 'Database error',
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve sensor readings from database',
        timestamp: new Date().toISOString()
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while retrieving sensor readings',
      timestamp: new Date().toISOString()
    });
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
      return res.status(400).json({
        success: false,
        error: 'Sensor ID is required',
        code: 'VALIDATION_ERROR',
        message: 'Sensor ID parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get readings for specific sensor
    const allReadings = await getLatestReadings(1000); // Get more for stats
    const sensorReadings = allReadings
      .filter(reading => reading.sensor_id === sensorId)
      .slice(0, limit);

    if (sensorReadings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No readings found',
        code: 'NOT_FOUND',
        message: `No readings found for sensor ${sensorId}`,
        timestamp: new Date().toISOString()
      });
    }

    // Calculate statistics
    const temperatures = sensorReadings.map(r => r.temperature);
    const humidities = sensorReadings.map(r => r.humidity);

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

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while retrieving sensor statistics',
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  submitSensorReading,
  getSensorReadingsAPI,
  getSensorStats
};