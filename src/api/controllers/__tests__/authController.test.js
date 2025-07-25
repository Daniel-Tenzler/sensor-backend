import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, getSessionStatus } from '../authController.js';
import sessionManager from '../../../shared/middleware/sessionManager.js';
import { hashSecret } from '../../../utils/auth.js';
import { SECRET_KEY } from '../../../config/app.js';

// Mock dependencies
vi.mock('../../../shared/middleware/sessionManager.js');
vi.mock('../../../utils/auth.js');
vi.mock('../../../config/app.js', () => ({
  SECRET_KEY: 'test-secret-key'
}));

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
      
      // Mock hash verification
      hashSecret
        .mockReturnValueOnce('hashed-secret') // expectedHash
        .mockReturnValueOnce('hashed-secret'); // providedHash
      
      // Mock session creation
      sessionManager.createSession.mockResolvedValue(mockSessionId);

      await login(req, res);

      expect(hashSecret).toHaveBeenCalledWith(SECRET_KEY);
      expect(hashSecret).toHaveBeenCalledWith(mockSecret);
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

    it('should reject login with invalid secret', async () => {
      const mockSecret = 'invalid-secret';
      
      req.body = { secret: mockSecret };
      
      // Mock hash verification - different hashes
      hashSecret
        .mockReturnValueOnce('expected-hash')
        .mockReturnValueOnce('different-hash');

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: 'The provided secret is incorrect',
        timestamp: expect.any(String)
      });
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should reject login with missing secret', async () => {
      req.body = {}; // No secret provided

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'Secret is required and must be a string',
        timestamp: expect.any(String)
      });
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should reject login with empty secret', async () => {
      req.body = { secret: '   ' }; // Empty/whitespace secret

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'Secret cannot be empty',
        timestamp: expect.any(String)
      });
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should handle session creation failure', async () => {
      const mockSecret = 'valid-secret';
      
      req.body = { secret: mockSecret };
      
      // Mock hash verification
      hashSecret
        .mockReturnValueOnce('hashed-secret')
        .mockReturnValueOnce('hashed-secret');
      
      // Mock session creation failure
      sessionManager.createSession.mockRejectedValue(new Error('Failed to create session'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session creation failed',
        code: 'SESSION_ERROR',
        message: 'Unable to create user session',
        timestamp: expect.any(String)
      });
    });

    it('should handle unexpected errors', async () => {
      const mockSecret = 'valid-secret';
      
      req.body = { secret: mockSecret };
      
      // Mock hash function to throw unexpected error
      hashSecret.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during login',
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

    it('should handle session validation errors', async () => {
      sessionManager.validateSession.mockRejectedValue(new Error('Session validation failed'));

      await getSessionStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session validation failed',
        code: 'SESSION_ERROR',
        message: 'Unable to validate session status',
        timestamp: expect.any(String)
      });
    });
  });
});