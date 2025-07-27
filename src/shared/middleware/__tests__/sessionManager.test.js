import { describe, it, expect, beforeEach, vi } from 'vitest';
import sessionManager from '../sessionManager.js';

// Mock express-session
vi.mock('express-session', () => ({
    default: vi.fn(() => (req, res, next) => {
        // Mock session middleware behavior
        req.session = {
            id: 'test-session-id',
            save: vi.fn((callback) => callback()),
            destroy: vi.fn((callback) => callback()),
            regenerate: vi.fn((callback) => callback())
        };
        next();
    })
}));

describe('SessionManager', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            session: {
                id: 'test-session-id',
                save: vi.fn((callback) => callback()),
                destroy: vi.fn((callback) => callback()),
                regenerate: vi.fn((callback) => callback())
            }
        };

        mockRes = {
            clearCookie: vi.fn()
        };

        // Reset environment
        delete process.env.SESSION_SECRET;
        delete process.env.NODE_ENV;
    });

    describe('getSessionConfig', () => {
        it('should return secure configuration for production', () => {
            process.env.NODE_ENV = 'production';
            process.env.SESSION_SECRET = 'test-secret';

            const config = sessionManager.getSessionConfig();

            expect(config.secret).toBe('test-secret');
            expect(config.name).toBe('sensor.session');
            expect(config.cookie.httpOnly).toBe(true);
            expect(config.cookie.secure).toBe(true);
            expect(config.cookie.sameSite).toBe('strict');
            expect(config.resave).toBe(false);
            expect(config.saveUninitialized).toBe(false);
            expect(config.rolling).toBe(true);
        });

        it('should return non-secure configuration for development', () => {
            process.env.NODE_ENV = 'development';

            const config = sessionManager.getSessionConfig();

            expect(config.cookie.secure).toBe(false);
        });

        it('should generate random secret if not provided', () => {
            const config = sessionManager.getSessionConfig();

            expect(config.secret).toBeDefined();
            expect(typeof config.secret).toBe('string');
            expect(config.secret.length).toBeGreaterThan(0);
        });
    });

    describe('createSession', () => {
        it('should create a session successfully', async() => {
            const userId = 'user123';

            const sessionId = await sessionManager.createSession(userId, mockReq, mockRes);

            expect(sessionId).toBe('test-session-id');
            expect(mockReq.session.userId).toBe(userId);
            expect(mockReq.session.createdAt).toBeInstanceOf(Date);
            expect(mockReq.session.isActive).toBe(true);
            expect(mockReq.session.save).toHaveBeenCalled();
        });

        it('should reject if session save fails', async() => {
            const userId = 'user123';
            const error = new Error('Save failed');
            mockReq.session.save = vi.fn((callback) => callback(error));

            await expect(sessionManager.createSession(userId, mockReq, mockRes))
                .rejects.toThrow('Failed to create session: Save failed');
        });
    });

    describe('validateSession', () => {
        it('should return session data for valid session', async() => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = true;
            mockReq.session.createdAt = new Date();

            const sessionData = await sessionManager.validateSession(mockReq);

            expect(sessionData).toEqual({
                sessionId: 'test-session-id',
                userId: 'user123',
                createdAt: mockReq.session.createdAt,
                isActive: true
            });
        });

        it('should return null for missing session', async() => {
            mockReq.session = null;

            const sessionData = await sessionManager.validateSession(mockReq);

            expect(sessionData).toBeNull();
        });

        it('should return null for session without userId', async() => {
            mockReq.session.userId = null;
            mockReq.session.isActive = true;

            const sessionData = await sessionManager.validateSession(mockReq);

            expect(sessionData).toBeNull();
        });

        it('should return null for inactive session', async() => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = false;

            const sessionData = await sessionManager.validateSession(mockReq);

            expect(sessionData).toBeNull();
        });

        it('should return null and destroy expired session', async() => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = true;
            // Set created time to 25 hours ago (expired)
            mockReq.session.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

            const sessionData = await sessionManager.validateSession(mockReq);

            expect(sessionData).toBeNull();
            expect(mockReq.session.destroy).toHaveBeenCalled();
        });
    });

    describe('destroySession', () => {
        it('should destroy session successfully', async() => {
            await sessionManager.destroySession(mockReq, mockRes);

            expect(mockReq.session.destroy).toHaveBeenCalled();
            expect(mockRes.clearCookie).toHaveBeenCalledWith('sensor.session');
        });

        it('should handle missing session gracefully', async() => {
            mockReq.session = null;

            await expect(sessionManager.destroySession(mockReq, mockRes))
                .resolves.toBeUndefined();
        });

        it('should work without response object', async() => {
            await sessionManager.destroySession(mockReq, null);

            expect(mockReq.session.destroy).toHaveBeenCalled();
            expect(mockRes.clearCookie).not.toHaveBeenCalled();
        });

        it('should reject if session destroy fails', async() => {
            const error = new Error('Destroy failed');
            mockReq.session.destroy = vi.fn((callback) => callback(error));

            await expect(sessionManager.destroySession(mockReq, mockRes))
                .rejects.toThrow('Failed to destroy session: Destroy failed');
        });
    });

    describe('isAuthenticated', () => {
        it('should return true for authenticated user', () => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = true;

            const result = sessionManager.isAuthenticated(mockReq);

            expect(result).toBe(true);
        });

        it('should return false for missing session', () => {
            mockReq.session = null;

            const result = sessionManager.isAuthenticated(mockReq);

            expect(result).toBe(false);
        });

        it('should return false for missing userId', () => {
            mockReq.session.userId = null;
            mockReq.session.isActive = true;

            const result = sessionManager.isAuthenticated(mockReq);

            expect(result).toBe(false);
        });

        it('should return false for inactive session', () => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = false;

            const result = sessionManager.isAuthenticated(mockReq);

            expect(result).toBe(false);
        });
    });

    describe('getUserId', () => {
        it('should return userId for authenticated user', () => {
            mockReq.session.userId = 'user123';
            mockReq.session.isActive = true;

            const userId = sessionManager.getUserId(mockReq);

            expect(userId).toBe('user123');
        });

        it('should return null for unauthenticated user', () => {
            mockReq.session = null;

            const userId = sessionManager.getUserId(mockReq);

            expect(userId).toBeNull();
        });
    });

    describe('regenerateSession', () => {
        it('should regenerate session successfully', async() => {
            await sessionManager.regenerateSession(mockReq);

            expect(mockReq.session.regenerate).toHaveBeenCalled();
        });

        it('should reject if regeneration fails', async() => {
            const error = new Error('Regenerate failed');
            mockReq.session.regenerate = vi.fn((callback) => callback(error));

            await expect(sessionManager.regenerateSession(mockReq))
                .rejects.toThrow('Failed to regenerate session: Regenerate failed');
        });
    });

    describe('cleanupExpiredSessions', () => {
        it('should resolve successfully', async() => {
            await expect(sessionManager.cleanupExpiredSessions())
                .resolves.toBeUndefined();
        });
    });

    describe('getSessionMiddleware', () => {
        it('should return express session middleware', () => {
            const middleware = sessionManager.getSessionMiddleware();

            expect(typeof middleware).toBe('function');
        });
    });
});