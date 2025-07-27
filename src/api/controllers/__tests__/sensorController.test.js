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

      await expect(submitSensorReading(req, res)).rejects.toThrow('Invalid sensor ID format');
      expect(insertSensorReading).not.toHaveBeenCalled();
    });

    it('should reject reading with empty sensor ID', async () => {
      req.body = {
        sensorId: '   ',
        humidity: 65.5,
        temperature: 22.3
      };

      await expect(submitSensorReading(req, res)).rejects.toThrow('Sensor ID cannot be empty');
      expect(insertSensorReading).not.toHaveBeenCalled();
    });

    it('should reject reading with missing humidity', async () => {
      req.body = {
        sensorId: 'sensor-001',
        temperature: 22.3
      };

      await expect(submitSensorReading(req, res)).rejects.toThrow('Humidity value is required');
      expect(insertSensorReading).not.toHaveBeenCalled();
    });

    it('should reject reading with invalid humidity range', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 150,
        temperature: 22.3
      };

      await expect(submitSensorReading(req, res)).rejects.toThrow('Humidity must be between 0 and 100');
      expect(insertSensorReading).not.toHaveBeenCalled();
    });

    it('should reject reading with invalid temperature range', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 150
      };

      await expect(submitSensorReading(req, res)).rejects.toThrow('Temperature must be between -50 and 100 degrees');
      expect(insertSensorReading).not.toHaveBeenCalled();
    });

    it('should reject reading with non-numeric values', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 'not-a-number',
        temperature: 22.3
      };

      await expect(submitSensorReading(req, res)).rejects.toThrow('Sensor values must be valid numbers');
      expect(insertSensorReading).not.toHaveBeenCalled();
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

      await expect(submitSensorReading(req, res)).rejects.toThrow('Failed to insert sensor reading');
    });

    it('should handle database errors', async () => {
      req.body = {
        sensorId: 'sensor-001',
        humidity: 65.5,
        temperature: 22.3
      };
      
      insertSensorReading.mockRejectedValue(new Error('database connection failed'));

      await expect(submitSensorReading(req, res)).rejects.toThrow('database connection failed');
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

      await expect(getSensorReadingsAPI(req, res)).rejects.toThrow('Limit must be between 1 and 1000');
      expect(getLatestReadings).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      getLatestReadings.mockRejectedValue(new Error('database query failed'));

      await expect(getSensorReadingsAPI(req, res)).rejects.toThrow('database query failed');
    });

    it('should handle null response from database', async () => {
      getLatestReadings.mockResolvedValue(null);

      await expect(getSensorReadingsAPI(req, res)).rejects.toThrow('Invalid response from database');
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

      await expect(getSensorStats(req, res)).rejects.toThrow('Sensor ID parameter is required');
      expect(getLatestReadings).not.toHaveBeenCalled();
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

      await expect(getSensorStats(req, res)).rejects.toThrow('No readings found for sensor nonexistent-sensor');
    });

    it('should handle database errors', async () => {
      req.params.sensorId = 'sensor-001';
      
      getLatestReadings.mockRejectedValue(new Error('Database connection failed'));

      await expect(getSensorStats(req, res)).rejects.toThrow('Database connection failed');
    });
  });
});