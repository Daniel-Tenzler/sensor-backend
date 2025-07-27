/**
 * Unit tests for API error handling middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  asyncHandler,
  apiErrorHandler,
  apiNotFoundHandler,
  rateLimitHandler,
  validateRequest,
  monitorError,
  healthCheckErrorHandler
} from '../errorHandler.js';
import {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  SensorError,
  ERROR_CODES
} from '../../utils/errorHandler.js';

describe('API Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      route: { path: '/api/test' },
      params: {},
      body: {},
      query: {},
      get: vi.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1',
      user: { id: 'user123' }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false
    };

    next = vi.fn();

    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
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

  describe('apiErrorHandler', () => {
    it('should skip if response headers already sent', () => {
      res.headersSent = true;
      const error = new Error('Test error');

      apiErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle APIError instances', () => {
      const error = new APIError('Custom error', ERROR_CODES.VALIDATION_ERROR, 400);

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Custom error',
          code: ERROR_CODES.VALIDATION_ERROR
        })
      );
    });

    it('should handle ValidationError instances', () => {
      const error = new ValidationError('Invalid input');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid input',
          code: ERROR_CODES.VALIDATION_ERROR
        })
      );
    });

    it('should handle AuthenticationError instances', () => {
      const error = new AuthenticationError('Invalid token');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid token',
          code: ERROR_CODES.UNAUTHORIZED
        })
      );
    });

    it('should handle AuthorizationError instances', () => {
      const error = new AuthorizationError('Access denied');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied',
          code: ERROR_CODES.FORBIDDEN
        })
      );
    });

    it('should handle NotFoundError instances', () => {
      const error = new NotFoundError('Resource not found');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Resource not found',
          code: ERROR_CODES.NOT_FOUND
        })
      );
    });

    it('should handle DatabaseError instances', () => {
      const error = new DatabaseError('Connection failed');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Connection failed',
          code: ERROR_CODES.DATABASE_ERROR
        })
      );
    });

    it('should handle SensorError instances', () => {
      const error = new SensorError('Invalid sensor data', 400);

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid sensor data',
          code: ERROR_CODES.SENSOR_ERROR
        })
      );
    });

    it('should handle JSON syntax errors', () => {
      const error = new SyntaxError('Unexpected token in JSON');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid JSON',
          code: ERROR_CODES.VALIDATION_ERROR
        })
      );
    });

    it('should handle connection errors', () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNREFUSED';

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Service unavailable',
          code: ERROR_CODES.SERVICE_UNAVAILABLE
        })
      );
    });

    it('should handle file size limit errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'File too large',
          code: ERROR_CODES.VALIDATION_ERROR
        })
      );
    });

    it('should handle CSRF token errors', () => {
      const error = new Error('Invalid CSRF token');
      error.code = 'EBADCSRFTOKEN';

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid CSRF token',
          code: ERROR_CODES.FORBIDDEN
        })
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');

      apiErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: ERROR_CODES.INTERNAL_ERROR
        })
      );
    });

    it('should include request ID when available', () => {
      req.id = 'req-123';
      const error = new Error('Test error');

      apiErrorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123'
        })
      );
    });

    it('should log errors with context', () => {
      const error = new Error('Test error');

      apiErrorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'API Error:',
        expect.any(String)
      );
    });
  });

  describe('apiNotFoundHandler', () => {
    it('should return 404 error for unknown API endpoints', () => {
      req.method = 'POST';
      req.path = '/api/unknown';

      apiNotFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'API endpoint not found',
          code: ERROR_CODES.NOT_FOUND,
          message: 'The API endpoint POST /api/unknown was not found'
        })
      );
    });
  });

  describe('rateLimitHandler', () => {
    it('should return 429 error for rate limit exceeded', () => {
      rateLimitHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded',
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        })
      );
    });
  });

  describe('validateRequest', () => {
    it('should pass validation when all required fields are present', () => {
      req.body = { name: 'test', email: 'test@example.com' };
      const schema = { required: ['name', 'email'] };
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation when required fields are missing', () => {
      req.body = { name: 'test' };
      const schema = { required: ['name', 'email'] };
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: 'email is required'
        })
      );
    });

    it('should use custom validation function when provided', () => {
      req.body = { age: 'not-a-number' };
      const schema = {
        validate: (data) => ({
          valid: !isNaN(data.age),
          message: 'Age must be a number'
        })
      };
      const middleware = validateRequest(schema, 'body');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: 'Age must be a number'
        })
      );
    });

    it('should validate query parameters when source is query', () => {
      req.query = { limit: '10' };
      const schema = { required: ['limit'] };
      const middleware = validateRequest(schema, 'query');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('monitorError', () => {
    it('should log critical errors', () => {
      const error = new APIError('Critical error', ERROR_CODES.INTERNAL_ERROR, 500);

      monitorError(error, req);

      expect(console.warn).toHaveBeenCalledWith(
        'CRITICAL ERROR DETECTED:',
        expect.objectContaining({
          error: 'Critical error',
          code: ERROR_CODES.INTERNAL_ERROR
        })
      );
    });

    it('should not log non-critical errors', () => {
      const error = new ValidationError('Validation failed');

      monitorError(error, req);

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('healthCheckErrorHandler', () => {
    it('should handle health check errors specially', () => {
      req.path = '/health';
      const error = new Error('Service unhealthy');

      healthCheckErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Service unhealthy',
          error: 'Service unhealthy'
        })
      );
    });

    it('should pass non-health-check errors to next middleware', () => {
      req.path = '/api/test';
      const error = new Error('Regular error');

      healthCheckErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle API health check errors', () => {
      req.path = '/api/health';
      const error = new Error('API unhealthy');

      healthCheckErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Service unhealthy'
        })
      );
    });
  });
});