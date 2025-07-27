import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, getSessionStatus } from '../authController.js';
import sessionManager from '../../../shared/middleware/sessionManager.js';

// Mock dependencies
vi.mock('../../../shared/middleware/sessionManager.js');

describe('API Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      session: {}
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

  describe('login', () => {
    it('should successfully login with valid secret', async () => {
      const mockSecret = 'valid-secret';
      const mockSessionId = 'session-123';
      
      req.body = { secret: mockSecret };
      
      // Mock session creation
      sessionManager.createSession.mockResolvedValue(mockSessionId);

      await login(req, res);

      expect(sessionManager.createSession).toHaveBeenCalledWith('sensor-user', req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'sensor-user',
            authenticated: true
          },
          sessionId: mockSessionId
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      sessionManager.destroySession.mockResolvedValue();

      await logout(req, res);

      expect(sessionManager.destroySession).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
        data: {
          user: {
            authenticated: false
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle logout even when session destruction fails', async () => {
      sessionManager.destroySession.mockRejectedValue(new Error('Session destruction failed'));

      await logout(req, res);

      expect(sessionManager.destroySession).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout completed',
        data: {
          user: {
            authenticated: false
          }
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('getSessionStatus', () => {
    it('should return active session status', async () => {
      const mockSessionData = {
        sessionId: 'session-123',
        userId: 'sensor-user',
        createdAt: new Date().toISOString(),
        isActive: true
      };

      sessionManager.validateSession.mockResolvedValue(mockSessionData);

      await getSessionStatus(req, res);

      expect(sessionManager.validateSession).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active session found',
        data: {
          user: {
            id: mockSessionData.userId,
            authenticated: true
          },
          session: {
            id: mockSessionData.sessionId,
            createdAt: mockSessionData.createdAt
          }
        },
        timestamp: expect.any(String)
      });
    });

    it('should return no active session status', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      await getSessionStatus(req, res);

      expect(sessionManager.validateSession).toHaveBeenCalledWith(req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'No active session',
        data: {
          user: {
            authenticated: false
          }
        },
        timestamp: expect.any(String)
      });
    });
  });
});