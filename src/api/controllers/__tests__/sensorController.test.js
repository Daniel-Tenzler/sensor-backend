import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitSensorReading, getSensorReadingsAPI, getSensorStats } from '../sensorController.js';
import { insertSensorReading, getLatestReadings } from '../../../services/sensorService.js';

// Mock dependencies
vi.mock('../../../services/sensorService.js');

describe('API Sensor Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('submitSensorReading', () => {
    it('should successfully submit valid sensor reading', async () => {
      const mockReading = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 22.3
      };
      
      req.body = mockReading;
      
      insertSensorReading.mockResolvedValue({
        success: true,
        id: 123
      });

      await submitSensorReading(req, res);

      expect(insertSensorReading).toHaveBeenCalledWith('sensor-001', 65.5, 22.3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Sensor reading recorded successfully',
        data: {
          id: 123,
          sensorId: 'sensor-001',
          humidity: 65.5,
          temperature: 22.3,
          timestamp: expect.any(String)
        },
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with missing sensor ID', async () => {
      req.body = {
        humidity: 65.5,
        temperature: 22.3
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid sensor ID format',
        code: 'SENSOR_ERROR',
        message: 'Invalid sensor ID format',
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with empty sensor ID', async () => {
      req.body = {
        sensorId: '   ',
        humidity: 65.5,
        temperature: 22.3
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sensor ID cannot be empty',
        code: 'SENSOR_ERROR',
        message: 'Sensor ID cannot be empty',
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with missing humidity', async () => {
      req.body = {
        sensorId: 'sensor-001',
        temperature: 22.3
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Humidity value is required',
        code: 'SENSOR_ERROR',
        message: 'Humidity value is required',
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with invalid humidity range', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 150,
        temperature: 22.3
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Humidity must be between 0 and 100',
        code: 'SENSOR_ERROR',
        message: 'Humidity must be between 0 and 100',
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with invalid temperature range', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 150
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Temperature must be between -50 and 100 degrees',
        code: 'SENSOR_ERROR',
        message: 'Temperature must be between -50 and 100 degrees',
        timestamp: expect.any(String)
      });
    });

    it('should reject reading with non-numeric values', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 'not-a-number',
        temperature: 22.3
      };

      await submitSensorReading(req, res);

      expect(insertSensorReading).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sensor values must be valid numbers',
        code: 'SENSOR_ERROR',
        message: 'Sensor values must be valid numbers',
        timestamp: expect.any(String)
      });
    });

    it('should handle database insertion failure', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 22.3
      };
      
      insertSensorReading.mockResolvedValue({
        success: false
      });

      await submitSensorReading(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to insert sensor reading',
        code: 'SENSOR_ERROR',
        message: 'Failed to insert sensor reading',
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 22.3
      };
      
      insertSensorReading.mockRejectedValue(new Error('database connection failed'));

      await submitSensorReading(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        code: 'DATABASE_ERROR',
        message: 'Failed to save sensor reading to database',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getSensorReadingsAPI', () => {
    it('should successfully retrieve sensor readings', async () => {
      const mockReadings = [
        {
          id: 1,
          sensor_id: 'sensor-001',
          humidity: 65.5,
          temperature: 22.3,
          timestamp: '2023-01-01T12:00:00Z'
        },
        {
          id: 2,
          sensor_id: 'sensor-002',
          humidity: 70.0,
          temperature: 25.0,
          timestamp: '2023-01-01T11:00:00Z'
        }
      ];

      getLatestReadings.mockResolvedValue(mockReadings);

      await getSensorReadingsAPI(req, res);

      expect(getLatestReadings).toHaveBeenCalledWith(100);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Retrieved 2 sensor readings',
        data: {
          readings: [
            {
              id: 1,
              sensorId: 'sensor-001',
              humidity: 65.5,
              temperature: 22.3,
              timestamp: '2023-01-01T12:00:00Z'
            },
            {
              id: 2,
              sensorId: 'sensor-002',
              humidity: 70.0,
              temperature: 25.0,
              timestamp: '2023-01-01T11:00:00Z'
            }
          ],
          count: 2,
          limit: 100
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle custom limit parameter', async () => {
      req.query.limit = '50';
      
      getLatestReadings.mockResolvedValue([]);

      await getSensorReadingsAPI(req, res);

      expect(getLatestReadings).toHaveBeenCalledWith(50);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject invalid limit parameter', async () => {
      req.query.limit = '2000'; // Above max limit

      await getSensorReadingsAPI(req, res);

      expect(getLatestReadings).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid limit parameter',
        code: 'VALIDATION_ERROR',
        message: 'Limit must be between 1 and 1000',
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      getLatestReadings.mockRejectedValue(new Error('database query failed'));

      await getSensorReadingsAPI(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve sensor readings from database',
        timestamp: expect.any(String)
      });
    });

    it('should handle null response from database', async () => {
      getLatestReadings.mockResolvedValue(null);

      await getSensorReadingsAPI(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid response from database',
        code: 'SENSOR_ERROR',
        message: 'Invalid response from database',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getSensorStats', () => {
    it('should successfully calculate sensor statistics', async () => {
      req.params.sensorId = 'sensor-001';
      
      const mockReadings = [
        {
          id: 1,
          sensor_id: 'sensor-001',
          humidity: 60,
          temperature: 20,
          timestamp: '2023-01-01T12:00:00Z'
        },
        {
          id: 2,
          sensor_id: 'sensor-001',
          humidity: 70,
          temperature: 25,
          timestamp: '2023-01-01T11:00:00Z'
        },
        {
          id: 3,
          sensor_id: 'sensor-002',
          humidity: 80,
          temperature: 30,
          timestamp: '2023-01-01T10:00:00Z'
        }
      ];

      getLatestReadings.mockResolvedValue(mockReadings);

      await getSensorStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statistics for sensor sensor-001',
        data: {
          sensorId: 'sensor-001',
          readingCount: 2,
          temperature: {
            min: 20,
            max: 25,
            avg: 22.5
          },
          humidity: {
            min: 60,
            max: 70,
            avg: 65
          },
          latestReading: mockReadings[0],
          oldestReading: mockReadings[1]
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle missing sensor ID parameter', async () => {
      req.params = {}; // No sensorId

      await getSensorStats(req, res);

      expect(getLatestReadings).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Sensor ID is required',
        code: 'VALIDATION_ERROR',
        message: 'Sensor ID parameter is required',
        timestamp: expect.any(String)
      });
    });

    it('should handle sensor with no readings', async () => {
      req.params.sensorId = 'nonexistent-sensor';
      
      getLatestReadings.mockResolvedValue([
        {
          id: 1,
          sensor_id: 'different-sensor',
          humidity: 60,
          temperature: 20,
          timestamp: '2023-01-01T12:00:00Z'
        }
      ]);

      await getSensorStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No readings found',
        code: 'NOT_FOUND',
        message: 'No readings found for sensor nonexistent-sensor',
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      req.params.sensorId = 'sensor-001';
      
      getLatestReadings.mockRejectedValue(new Error('Database connection failed'));

      await getSensorStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while retrieving sensor statistics',
        timestamp: expect.any(String)
      });
    });
  });
});