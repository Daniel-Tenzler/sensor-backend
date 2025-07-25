import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../authRoutes.js';

// Mock the session manager
vi.mock('../../../shared/middleware/sessionManager.js', () => ({
  default: {
    createSession: vi.fn(),
    destroySession: vi.fn(),
    validateSession: vi.fn()
  }
}));

// Mock the auth utilities
vi.mock('../../../utils/auth.js', () => ({
  hashSecret: vi.fn((secret) => `hashed_${secret}`)
}));

// Mock the config
vi.mock('../../../config/app.js', () => ({
  SECRET_KEY: 'test_secret'
}));

// Import mocked modules
import sessionManager from '../../../shared/middleware/sessionManager.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('API Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      sessionManager.createSession.mockResolvedValue('session123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ secret: 'test_secret' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'sensor-user',
            authenticated: true
          }
        }
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ secret: 'wrong_secret' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    });

    it('should return 400 for missing secret', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      sessionManager.destroySession.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful',
        data: {
          user: {
            authenticated: false
          }
        }
      });
    });

    it('should handle logout errors gracefully', async () => {
      sessionManager.destroySession.mockRejectedValue(new Error('Session error'));

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout completed',
        data: {
          user: {
            authenticated: false
          }
        }
      });
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return session status for authenticated user', async () => {
      sessionManager.validateSession.mockResolvedValue({
        userId: 'sensor-user',
        sessionId: 'session123',
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Active session found',
        data: {
          user: {
            id: 'sensor-user',
            authenticated: true
          }
        }
      });
    });

    it('should return no session for unauthenticated user', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'No active session',
        data: {
          user: {
            authenticated: false
          }
        }
      });
    });
  });
});