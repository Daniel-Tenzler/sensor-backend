import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../dashboardRoutes.js';

// Mock the session manager
vi.mock('../../../shared/middleware/sessionManager.js', () => ({
  default: {
    validateSession: vi.fn(),
    isAuthenticated: vi.fn(),
    getUserId: vi.fn()
  }
}));

// Import mocked modules
import sessionManager from '../../../shared/middleware/sessionManager.js';

const app = express();
app.use(express.json());
app.use('/', dashboardRoutes);

describe('Frontend Dashboard Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should serve dashboard page for authenticated user', async () => {
      sessionManager.validateSession.mockResolvedValue({
        userId: 'sensor-user',
        sessionId: 'session123'
      });
      sessionManager.isAuthenticated.mockReturnValue(true);
      sessionManager.getUserId.mockReturnValue('sensor-user');

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Sensor Dashboard');
      expect(response.text).toContain('Welcome, sensor-user');
      expect(response.text).toContain('Submit Sensor Reading');
      expect(response.text).toContain('Recent Sensor Readings');
    });

    it('should redirect unauthenticated user to login', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/')
        .expect(302);

      expect(response.headers.location).toContain('/login');
    });

    it('should include return URL in redirect for unauthenticated user', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/')
        .expect(302);

      expect(response.headers.location).toContain('returnUrl=');
    });

    it('should handle authentication errors gracefully', async () => {
      sessionManager.validateSession.mockRejectedValue(new Error('Session error'));

      const response = await request(app)
        .get('/')
        .expect(302);

      expect(response.headers.location).toContain('/login?error=auth_error');
    });
  });
});