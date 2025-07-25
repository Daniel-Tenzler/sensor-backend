import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  authenticateAPI,
  requireAPIAuth,
  optionalAPIAuth,
  createAPIError,
  apiErrorHandler,
  requirePermissions
} from '../apiAuth.js';

// Mock the session manager
vi.mock('../../../shared/middleware/sessionManager.js', () => ({
  default: {
    validateSession: vi.fn()
  }
}));

import sessionManager from '../../../shared/middleware/sessionManager.js';

describe('API Authentication Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      session: {},
      user: null
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false
    };

    mockNext = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('authenticateAPI', () => {
    it('should authenticate valid session and attach user context', async () => {
      const sessionData = {
        userId: 'user123',
        sessionId: 'session123',
        isActive: true
      };

      sessionManager.validateSession.mockResolvedValue(sessionData);

      await authenticateAPI(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user123',
        sessionId: 'session123',
        authenticated: true
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid session', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      await authenticateAPI(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        message: 'Valid session required to access this resource',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 for session validation error', async () => {
      sessionManager.validateSession.mockRejectedValue(new Error('Session error'));

      await authenticateAPI(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication error',
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAPIAuth', () => {
    it('should be an alias for authenticateAPI', () => {
      expect(requireAPIAuth).toBe(authenticateAPI);
    });
  });

  describe('optionalAPIAuth', () => {
    it('should attach user context for valid session', async () => {
      const sessionData = {
        userId: 'user123',
        sessionId: 'session123',
        isActive: true
      };

      sessionManager.validateSession.mockResolvedValue(sessionData);

      await optionalAPIAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user123',
        sessionId: 'session123',
        authenticated: true
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set unauthenticated context for invalid session', async () => {
      sessionManager.validateSession.mockResolvedValue(null);

      await optionalAPIAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: null,
        sessionId: null,
        authenticated: false
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue with unauthenticated context on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionManager.validateSession.mockRejectedValue(new Error('Session error'));

      await optionalAPIAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: null,
        sessionId: null,
        authenticated: false
      });
      expect(mockNext).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Optional API authentication error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('createAPIError', () => {
    it('should create structured error response with default status', () => {
      const error = createAPIError('Test error', 'TEST_CODE', 'Test message');

      expect(error).toEqual({
        success: false,
        error: 'Test error',
        code: 'TEST_CODE',
        message: 'Test message',
        timestamp: expect.any(String),
        status: 500
      });
    });

    it('should create structured error response with custom status', () => {
      const error = createAPIError('Test error', 'TEST_CODE', 'Test message', 400);

      expect(error).toEqual({
        success: false,
        error: 'Test error',
        code: 'TEST_CODE',
        message: 'Test message',
        timestamp: expect.any(String),
        status: 400
      });
    });
  });

  describe('apiErrorHandler', () => {
    let mockError;

    beforeEach(() => {
      mockError = new Error('Test error');
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    it('should delegate to default handler if headers already sent', () => {
      mockRes.headersSent = true;

      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle ValidationError', () => {
      mockError.name = 'ValidationError';
      mockError.message = 'Invalid input';

      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        timestamp: expect.any(String),
        status: 400
      });
    });

    it('should handle UnauthorizedError', () => {
      mockError.name = 'UnauthorizedError';

      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        message: 'Valid authentication required to access this resource',
        timestamp: expect.any(String),
        status: 401
      });
    });

    it('should handle ForbiddenError', () => {
      mockError.name = 'ForbiddenError';

      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access forbidden',
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource',
        timestamp: expect.any(String),
        status: 403
      });
    });

    it('should handle NotFoundError', () => {
      mockError.name = 'NotFoundError';

      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        timestamp: expect.any(String),
        status: 404
      });
    });

    it('should handle generic errors', () => {
      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: expect.any(String),
        status: 500
      });
    });

    it('should log errors', () => {
      apiErrorHandler(mockError, mockReq, mockRes, mockNext);

      expect(console.error).toHaveBeenCalledWith('API Error:', mockError);
    });
  });

  describe('requirePermissions', () => {
    it('should return 401 for unauthenticated user', () => {
      const middleware = requirePermissions('read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access this resource',
        timestamp: expect.any(String),
        status: 401
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for user with authenticated false', () => {
      mockReq.user = { authenticated: false };
      const middleware = requirePermissions('read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow authenticated user (simplified permission check)', () => {
      mockReq.user = { authenticated: true, id: 'user123' };
      const middleware = requirePermissions('read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle array of permissions', () => {
      mockReq.user = { authenticated: true, id: 'user123' };
      const middleware = requirePermissions(['read', 'write']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});