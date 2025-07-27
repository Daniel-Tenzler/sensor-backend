import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import sensorRoutes from '../sensorRoutes.js';

// Mock the session manager
vi.mock('../../../shared/middleware/sessionManager.js', () => ({
  default: {
    validateSession: vi.fn()
  }
}));

// Mock the sensor service
vi.mock('../../../services/sensorService.js', () => ({
  insertSensorReading: vi.fn(),
  getLatestReadings: vi.fn()
}));

// Import mocked modules
import sessionManager from '../../../shared/middleware/sessionManager.js';
import { insertSensorReading, getLatestReadings } from '../../../services/sensorService.js';

const app = express();
app.use(express.json());
app.use('/api/sensors', sensorRoutes);

describe('API Sensor Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful authentication by default
    sessionManager.validateSession.mockResolvedValue({
      userId: 'sensor-user',
      sessionId: 'session123'
    });
  });

  describe('POST /api/sensors/submit', () => {
    it('should submit sensor reading successfully when authenticated', async () => {
      insertSensorReading.mockResolvedValue({
        success: true,
        id: 1
      });

      const response = await request(app)
        .post('/api/sensors/submit')
        .send({
          sensorId: 'sensor1',
          humidity: 65.5,
          temperature: 22.3
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Sensor reading recorded successfully',
        data: {
          sensorId: 'sensor1',
          humidity: 65.5,
          temperature: 22.3
        }
      });
    });
  });

  describe('GET /api/sensors/readings', () => {
    it('should return sensor readings when authenticated', async () => {
      const mockReadings = [
        {
          id: 1,
          sensor_id: 'sensor1',
          humidity: 65.5,
          temperature: 22.3,
          timestamp: '2023-01-01T00:00:00Z'
        }
      ];
      
      getLatestReadings.mockResolvedValue(mockReadings);

      const response = await request(app)
        .get('/api/sensors/readings')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          readings: [
            {
              id: 1,
              sensorId: 'sensor1',
              humidity: 65.5,
              temperature: 22.3,
              timestamp: '2023-01-01T00:00:00Z'
            }
          ],
          count: 1
        }
      });
    });

    it('should handle limit parameter', async () => {
      getLatestReadings.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/sensors/readings?limit=50')
        .expect(200);

      expect(getLatestReadings).toHaveBeenCalledWith(50);
      expect(response.body.data.limit).toBe(50);
    });
  });

  describe('GET /api/sensors/stats/:sensorId', () => {
    it('should return sensor statistics when authenticated', async () => {
      const mockReadings = [
        {
          id: 1,
          sensor_id: 'sensor1',
          humidity: 65.5,
          temperature: 22.3,
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          sensor_id: 'sensor1',
          humidity: 70.0,
          temperature: 25.0,
          timestamp: '2023-01-01T01:00:00Z'
        }
      ];
      
      getLatestReadings.mockResolvedValue(mockReadings);

      const response = await request(app)
        .get('/api/sensors/stats/sensor1')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          sensorId: 'sensor1',
          readingCount: 2,
          temperature: {
            min: 22.3,
            max: 25.0
          },
          humidity: {
            min: 65.5,
            max: 70.0
          }
        }
      });
    });
  });
});