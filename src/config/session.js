import crypto from 'crypto';

/**
 * Session configuration settings
 * These settings control session behavior and security
 */
export const sessionConfig = {
    // Session secret - should be set via environment variable in production
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),

    // Session cookie name
    name: 'sensor.session',

    // Cookie configuration
    cookie: {
        // HTTP-only cookies prevent XSS attacks
        httpOnly: true,

        secure: true,

        // Session duration: 24 hours
        maxAge: 24 * 60 * 60 * 1000,

        // SameSite prevents CSRF attacks
        sameSite: 'strict'
    },

    // Don't save session if unmodified
    resave: false,

    // Don't create session until something stored
    saveUninitialized: false,

    // Reset expiration on activity
    rolling: true
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'"
};

/**
 * Session cleanup interval (in milliseconds)
 * Run cleanup every hour
 */
export const CLEANUP_INTERVAL = 60 * 60 * 1000;