/**
 * Unit tests for frontend error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FRONTEND_ERROR_TYPES,
  FrontendError,
  FrontendAuthError,
  FrontendNotFoundError,
  FrontendValidationError,
  escapeHtml,
  generateErrorHTML,
  logFrontendError,
  getErrorDetails
} from '../errorHandler.js';

describe('Frontend Error Handler Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('FRONTEND_ERROR_TYPES', () => {
    it('should contain all expected error types', () => {
      expect(FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED).toBe('AUTHENTICATION_REQUIRED');
      expect(FRONTEND_ERROR_TYPES.ACCESS_FORBIDDEN).toBe('ACCESS_FORBIDDEN');
      expect(FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND).toBe('PAGE_NOT_FOUND');
      expect(FRONTEND_ERROR_TYPES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(FRONTEND_ERROR_TYPES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(FRONTEND_ERROR_TYPES.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('FrontendError', () => {
    it('should create a FrontendError with default values', () => {
      const error = new FrontendError('Test error');

      expect(error.name).toBe('FrontendError');
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(FRONTEND_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeNull();
      expect(error.timestamp).toBeDefined();
    });

    it('should create a FrontendError with custom values', () => {
      const details = { field: 'test' };
      const error = new FrontendError(
        'Custom error',
        FRONTEND_ERROR_TYPES.VALIDATION_ERROR,
        400,
        details
      );

      expect(error.message).toBe('Custom error');
      expect(error.type).toBe(FRONTEND_ERROR_TYPES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toBe(details);
    });
  });

  describe('FrontendAuthError', () => {
    it('should create a FrontendAuthError with default message', () => {
      const error = new FrontendAuthError();

      expect(error.name).toBe('FrontendAuthError');
      expect(error.message).toBe('Authentication required');
      expect(error.type).toBe(FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED);
      expect(error.statusCode).toBe(401);
    });

    it('should create a FrontendAuthError with custom message', () => {
      const error = new FrontendAuthError('Invalid session');

      expect(error.message).toBe('Invalid session');
    });
  });

  describe('FrontendNotFoundError', () => {
    it('should create a FrontendNotFoundError with default message', () => {
      const error = new FrontendNotFoundError();

      expect(error.name).toBe('FrontendNotFoundError');
      expect(error.message).toBe('Page not found');
      expect(error.type).toBe(FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('FrontendValidationError', () => {
    it('should create a FrontendValidationError with correct properties', () => {
      const error = new FrontendValidationError('Invalid input');

      expect(error.name).toBe('FrontendValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.type).toBe(FRONTEND_ERROR_TYPES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new FrontendValidationError('Invalid email', details);

      expect(error.details).toBe(details);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';

      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle empty or null input', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should escape all dangerous characters', () => {
      const input = '&<>"\'';
      const expected = '&amp;&lt;&gt;&quot;&#039;';

      expect(escapeHtml(input)).toBe(expected);
    });
  });

  describe('generateErrorHTML', () => {
    it('should generate basic error HTML', () => {
      const html = generateErrorHTML('Test Error', 'Test message', 500);

      expect(html).toContain('Test Error');
      expect(html).toContain('Test message');
      expect(html).toContain('Error Code: 500');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should include custom options', () => {
      const options = {
        showBackButton: false,
        showHomeButton: false,
        showLoginButton: true,
        customActions: [{ url: '/test', text: 'Test Action', class: 'btn-test' }],
        additionalInfo: 'Additional details'
      };

      const html = generateErrorHTML('Test Error', 'Test message', 404, options);

      expect(html).toContain('Go to Login');
      expect(html).toContain('Test Action');
      expect(html).toContain('Additional details');
      expect(html).not.toContain('Go Back');
      expect(html).not.toContain('Go to Dashboard');
    });

    it('should apply correct error class based on status code', () => {
      const serverErrorHtml = generateErrorHTML('Server Error', 'Message', 500);
      const clientErrorHtml = generateErrorHTML('Client Error', 'Message', 400);

      expect(serverErrorHtml).toContain('server-error');
      expect(clientErrorHtml).toContain('client-error');
    });

    it('should escape HTML in title and message', () => {
      const html = generateErrorHTML(
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>'
      );

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
    });
  });

  describe('logFrontendError', () => {
    it('should log error with basic information', () => {
      const error = new FrontendError('Test error');

      logFrontendError(error);

      expect(console.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.stringContaining('Test error')
      );
    });

    it('should log error with request context', () => {
      const error = new FrontendError('Test error');
      const req = {
        method: 'GET',
        url: '/test',
        get: vi.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        user: { id: 'user123' },
        sessionID: 'session123'
      };

      logFrontendError(error, req, { additional: 'context' });

      expect(console.error).toHaveBeenCalledWith('Frontend Error:', expect.stringContaining('GET'));
    });
  });

  describe('getErrorDetails', () => {
    it('should return correct details for authentication error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.AUTHENTICATION_REQUIRED);

      expect(details.title).toBe('Authentication Required');
      expect(details.statusCode).toBe(401);
      expect(details.showLoginButton).toBe(true);
      expect(details.showHomeButton).toBe(false);
    });

    it('should return correct details for not found error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.PAGE_NOT_FOUND);

      expect(details.title).toBe('Page Not Found');
      expect(details.statusCode).toBe(404);
    });

    it('should return correct details for validation error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.VALIDATION_ERROR);

      expect(details.title).toBe('Invalid Input');
      expect(details.statusCode).toBe(400);
    });

    it('should return correct details for internal error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.INTERNAL_ERROR);

      expect(details.title).toBe('Internal Server Error');
      expect(details.statusCode).toBe(500);
    });

    it('should return default error details for unknown error type', () => {
      const details = getErrorDetails('UNKNOWN_ERROR_TYPE');

      expect(details.title).toBe('Internal Server Error');
      expect(details.statusCode).toBe(500);
    });

    it('should return correct details for service unavailable error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.SERVICE_UNAVAILABLE);

      expect(details.title).toBe('Service Unavailable');
      expect(details.statusCode).toBe(503);
    });

    it('should return correct details for session expired error', () => {
      const details = getErrorDetails(FRONTEND_ERROR_TYPES.SESSION_EXPIRED);

      expect(details.title).toBe('Session Expired');
      expect(details.statusCode).toBe(401);
      expect(details.showLoginButton).toBe(true);
      expect(details.showHomeButton).toBe(false);
    });
  });
});
