/**
 * Unit tests for API error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ERROR_CODES,
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  SensorError,
  createErrorResponse,
  logError,
  shouldExposeError,
  sanitizeError
} from '../errorHandler.js';

describe('API Error Handler Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('ERROR_CODES', () => {
    it('should contain all expected error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ERROR_CODES.SENSOR_ERROR).toBe('SENSOR_ERROR');
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

  describe('APIError', () => {
    it('should create an APIError with default values', () => {
      const error = new APIError('Test error');
      
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeNull();
      expect(error.timestamp).toBeDefined();
    });

    it('should create an APIError with custom values', () => {
      const details = { field: 'test' };
      const error = new APIError('Custom error', ERROR_CODES.VALIDATION_ERROR, 400, details);
      
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toBe(details);
    });

    it('should convert to JSON format', () => {
      const error = new APIError('Test error', ERROR_CODES.VALIDATION_ERROR, 400);
      const json = error.toJSON();
      
      expect(json).toEqual({
        success: false,
        error: 'Test error',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test error',
        details: null,
        timestamp: error.timestamp
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid email', details);
      
      expect(error.details).toBe(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
    });

    it('should create an AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError with default message', () => {
      const error = new AuthorizationError();
      
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Access forbidden');
      expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();
      
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('DatabaseError', () => {
    it('should create a DatabaseError with default message', () => {
      const error = new DatabaseError();
      
      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Database operation failed');
      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('SensorError', () => {
    it('should create a SensorError with default status code', () => {
      const error = new SensorError('Invalid sensor data');
      
      expect(error.name).toBe('SensorError');
      expect(error.message).toBe('Invalid sensor data');
      expect(error.code).toBe(ERROR_CODES.SENSOR_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('should create a SensorError with custom status code', () => {
      const error = new SensorError('Sensor not found', 404);
      
      expect(error.statusCode).toBe(404);
    });
  });

  describe('createErrorResponse', () => {
    it('should create a structured error response', () => {
      const response = createErrorResponse(
        'Test error',
        ERROR_CODES.VALIDATION_ERROR,
        'User friendly message',
        400,
        { field: 'test' }
      );
      
      expect(response).toEqual({
        success: false,
        error: 'Test error',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'User friendly message',
        details: { field: 'test' },
        timestamp: expect.any(String),
        statusCode: 400
      });
    });

    it('should use default values when not provided', () => {
      const response = createErrorResponse('Test error', ERROR_CODES.INTERNAL_ERROR, 'Test message');
      
      expect(response.statusCode).toBe(500);
      expect(response.details).toBeNull();
    });
  });

  describe('logError', () => {
    it('should log error with basic information', () => {
      const error = new Error('Test error');
      error.code = 'TEST_CODE';
      
      logError(error);
      
      expect(console.error).toHaveBeenCalledWith(
        'API Error:',
        expect.stringContaining('Test error')
      );
    });

    it('should log error with request context', () => {
      const error = new Error('Test error');
      const req = {
        method: 'POST',
        url: '/api/test',
        get: vi.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        user: { id: 'user123' }
      };
      
      logError(error, req, { additional: 'context' });
      
      expect(console.error).toHaveBeenCalledWith(
        'API Error:',
        expect.stringContaining('POST')
      );
    });
  });

  describe('shouldExposeError', () => {
    beforeEach(() => {
      // Reset NODE_ENV
      delete process.env.NODE_ENV;
    });

    it('should expose validation errors', () => {
      const error = new ValidationError('Invalid input');
      expect(shouldExposeError(error)).toBe(true);
    });

    it('should expose authentication errors', () => {
      const error = new AuthenticationError('Invalid token');
      expect(shouldExposeError(error)).toBe(true);
    });

    it('should expose authorization errors', () => {
      const error = new AuthorizationError('Access denied');
      expect(shouldExposeError(error)).toBe(true);
    });

    it('should expose not found errors', () => {
      const error = new NotFoundError('Resource not found');
      expect(shouldExposeError(error)).toBe(true);
    });

    it('should expose sensor errors', () => {
      const error = new SensorError('Invalid sensor data');
      expect(shouldExposeError(error)).toBe(true);
    });

    it('should not expose internal errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal error');
      expect(shouldExposeError(error)).toBe(false);
    });

    it('should expose internal errors in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Internal error');
      expect(shouldExposeError(error)).toBe(true);
    });
  });

  describe('sanitizeError', () => {
    it('should return full error details for exposable errors', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const sanitized = sanitizeError(error);
      
      expect(sanitized.error).toBe('Invalid input');
      expect(sanitized.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(sanitized.details).toEqual({ field: 'email' });
    });

    it('should return generic error for non-exposable errors', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database connection failed');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.error).toBe('Internal server error');
      expect(sanitized.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(sanitized.message).toBe('An unexpected error occurred');
    });

    it('should handle APIError instances correctly', () => {
      const error = new ValidationError('Custom error'); // Use ValidationError which is always exposed
      const sanitized = sanitizeError(error);
      
      expect(sanitized).toEqual(error.toJSON());
    });
  });
});