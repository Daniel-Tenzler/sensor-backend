import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../authRoutes.js';

// Mock the session manager
vi.mock('../../../shared/middleware/sessionManager.js', () => ({
  default: {
    validateSession: vi.fn(),
    createSession: vi.fn(),
    destroySession: vi.fn(),
    isAuthenticated: vi.fn(),
    getUserId: vi.fn()
  }
}));

// No need for auth utilities or config mocks anymore

// Import mocked modules
import sessionManager from '../../../shared/middleware/sessionManager.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', authRoutes);

describe('Frontend Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /login', () => {
    it('should serve login page for unauthenticated user', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/login')
        .expect(200);

      expect(response.text).toContain('Login - Sensor Dashboard');
      expect(response.text).toContain('Secret Key:');
      expect(response.text).toContain('<form method="POST" action="/login"');
    });

    it('should redirect authenticated user to dashboard', async () => {
      sessionManager.validateSession.mockResolvedValue({
        userId: 'sensor-user',
        sessionId: 'session123'
      });

      const response = await request(app)
        .get('/login')
        .expect(302);

      expect(response.headers.location).toBe('/');
    });

    it('should display error message from query params', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/login?error=auth_failed&message=Invalid credentials')
        .expect(200);

      expect(response.text).toContain('Invalid credentials');
      expect(response.text).toContain('alert-error');
    });

    it('should display success message from query params', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/login?message=Successfully logged out')
        .expect(200);

      expect(response.text).toContain('Successfully logged out');
      expect(response.text).toContain('alert-success');
    });
  });

  describe('POST /login', () => {
    it('should redirect to dashboard on successful login', async () => {
      sessionManager.validateSession.mockResolvedValue(null);
      sessionManager.createSession.mockResolvedValue('session123');

      const response = await request(app)
        .post('/login')
        .send({ secret: 'test_secret' })
        .expect(302);

      expect(response.headers.location).toBe('/');
    });

    it('should redirect authenticated user to dashboard without processing', async () => {
      sessionManager.validateSession.mockResolvedValue({
        userId: 'sensor-user',
        sessionId: 'session123'
      });

      const response = await request(app)
        .post('/login')
        .send({ secret: 'test_secret' })
        .expect(302);

      expect(response.headers.location).toBe('/');
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });
  });
});