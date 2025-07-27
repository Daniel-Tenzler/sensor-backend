/**
 * Unit tests for frontend error handling middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  asyncHandler,
  frontendErrorHandler,
  frontendNotFoundHandler,
  handleAuthenticationError,
  validateSession,
  rateLimitErrorHandler,
  csrfErrorHandler,
  healthCheckErrorHandler,
  monitorFrontendError
} from '../errorHandler.js';
import {
  FrontendError,
  FrontendAuthError,
  FrontendNotFoundError,
  FrontendValidationError,
  FRONTEND_ERROR_TYPES
} from '../../utils/errorHandler.js';

describe('Frontend Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test',
      path: '/test',
      originalUrl: '/test',
      route: { path: '/test' },
      params: {},
      body: {},
      query: {},
      get: vi.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1',
      user: { id: 'user123' },
      sessionID: 'session123',
      xhr: false,
      headers: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      headersSent: false
    };

    next = vi.fn();

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.send('Success');
      });

      await handler(req, res, next);

      expect(res.send).toHaveBeenCalledWith('Success');
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle promise rejections', async () => {
      const error = new Error('Promise rejection');
      const handler = asyncHandler(() => {
        return Promise.reject(error);
      });

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('frontendErrorHandler', () => {
    it('should skip if response headers already sent', () => {
      res.headersSent = true;
      const error = new Error('Test error');

      frontendErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle FrontendError instances', () => {
      const error = new FrontendError('Custom error', FRONTEND_ERROR_TYPES.VALIDATION_ERROR, 400);

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Custom error'));
    });

    it('should handle FrontendAuthError instances', () => {
      const error = new FrontendAuthError('Invalid session');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Invalid session'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Go to Login'));
    });

    it('should handle FrontendNotFoundError instances', () => {
      const error = new FrontendNotFoundError('Page not found');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Page not found'));
    });

    it('should handle FrontendValidationError instances', () => {
      const error = new FrontendValidationError('Invalid input');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Invalid input'));
    });

    it('should handle authentication errors from other sources', () => {
      const error = new Error('authentication failed');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Authentication Required'));
    });

    it('should handle database errors', () => {
      const error = new Error('database connection failed');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Database Error'));
    });

    it('should handle connection errors', () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNREFUSED';

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Service Unavailable'));
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      error.code = 'TIMEOUT';

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(408);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Request Timeout'));
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      frontendErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'));
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      frontendErrorHandler(error, req, res, next);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Test error'));

      // Reset NODE_ENV
      delete process.env.NODE_ENV;
    });

    it('should log errors with context', () => {
      const error = new Error('Test error');

      frontendErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith('Frontend Error:', expect.any(String));
    });
  });

  describe('frontendNotFoundHandler', () => {
    it('should return 404 error for unknown pages', () => {
      req.path = '/unknown-page';

      frontendNotFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Page Not Found'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('/unknown-page'));
    });
  });

  describe('handleAuthenticationError', () => {
    it('should redirect to login for regular requests', () => {
      handleAuthenticationError(req, res, 'Custom auth message');

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error=auth_required')
      );
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('returnUrl=%2Ftest'));
    });

    it('should return JSON for AJAX requests', () => {
      req.xhr = true;

      handleAuthenticationError(req, res, 'Custom auth message');

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
          message: 'Custom auth message'
        })
      );
    });

    it('should return JSON for requests accepting JSON', () => {
      req.headers.accept = 'application/json';

      handleAuthenticationError(req, res, 'Custom auth message');

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required'
        })
      );
    });
  });

  describe('validateSession', () => {
    it('should call next when session is valid', async () => {
      const sessionValidator = vi.fn().mockResolvedValue(true);
      const middleware = validateSession(sessionValidator);

      await middleware(req, res, next);

      expect(sessionValidator).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled();
    });

    it('should handle authentication error when session is invalid', async () => {
      const sessionValidator = vi.fn().mockResolvedValue(false);
      const middleware = validateSession(sessionValidator);

      await middleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login'));
    });

    it('should handle validation errors', async () => {
      const sessionValidator = vi.fn().mockRejectedValue(new Error('Validation failed'));
      const middleware = validateSession(sessionValidator);

      await middleware(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/login'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('rateLimitErrorHandler', () => {
    it('should return 429 error for rate limit exceeded', () => {
      rateLimitErrorHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Too Many Requests'));
    });
  });

  describe('csrfErrorHandler', () => {
    it('should return 403 error for CSRF token errors', () => {
      csrfErrorHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Security Error'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Refresh Page'));
    });
  });

  describe('healthCheckErrorHandler', () => {
    it('should handle health check errors specially', () => {
      req.path = '/health';
      const error = new Error('Service unhealthy');

      healthCheckErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Service Unhealthy'));
    });

    it('should handle status endpoint errors', () => {
      req.path = '/status';
      const error = new Error('Status check failed');

      healthCheckErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Service Unhealthy'));
    });

    it('should pass non-health-check errors to next middleware', () => {
      req.path = '/regular-page';
      const error = new Error('Regular error');

      healthCheckErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('monitorFrontendError', () => {
    it('should log critical errors', () => {
      const error = new FrontendError('Critical error', FRONTEND_ERROR_TYPES.INTERNAL_ERROR, 500);

      monitorFrontendError(error, req);

      expect(console.warn).toHaveBeenCalledWith(
        'CRITICAL FRONTEND ERROR:',
        expect.objectContaining({
          error: 'Critical error',
          type: FRONTEND_ERROR_TYPES.INTERNAL_ERROR
        })
      );
    });

    it('should not log non-critical errors', () => {
      const error = new FrontendValidationError('Validation failed');

      monitorFrontendError(error, req);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not log errors that are not FrontendError instances', () => {
      const error = new Error('Generic error');

      monitorFrontendError(error, req);

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
