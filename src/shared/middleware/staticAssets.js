import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure static asset serving middleware with proper caching headers
 * @returns {express.Handler} Express middleware for serving static assets
 */
export function configureStaticAssets() {
    // Path to public directory (relative to project root)
    const publicPath = path.join(__dirname, '../../../public');

    // Configure static middleware with caching options
    const staticOptions = {
        // Set cache control headers
        setHeaders: (res, path) => {
            // Get file extension
            const ext = path.split('.').pop().toLowerCase();

            // Set different cache durations based on file type
            switch (ext) {
                case 'css':
                case 'js':
                    // Cache CSS and JS files for 1 day
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    break;
                case 'ico':
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif':
                case 'svg':
                    // Cache images for 7 days
                    res.setHeader('Cache-Control', 'public, max-age=604800');
                    break;
                default:
                    // Default cache for other files (1 hour)
                    res.setHeader('Cache-Control', 'public, max-age=3600');
            }

            // Add security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Set proper MIME types for common files
            if (ext === 'css') {
                res.setHeader('Content-Type', 'text/css');
            } else if (ext === 'js') {
                res.setHeader('Content-Type', 'application/javascript');
            }
        },

        // Enable ETag for better caching
        etag: true,

        // Enable Last-Modified header
        lastModified: true,

        // Set index file (though we won't use it for our API/frontend separation)
        index: false
    };

    return express.static(publicPath, staticOptions);
}

/**
 * Security headers middleware for enhanced security
 * @returns {express.Handler} Express middleware for security headers
 */
export function securityHeaders() {
    return (req, res, next) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');

        // Only set HSTS in production with HTTPS
        if (process.env.NODE_ENV === 'production' && req.secure) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Content Security Policy for static assets
        res.setHeader('Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self';"
        );

        next();
    };
}

/**
 * Favicon middleware to serve favicon.ico
 * @returns {express.Handler} Express middleware for favicon
 */
export function serveFavicon() {
    const faviconPath = path.join(__dirname, '../../../public/images/favicon.ico');

    return (req, res, next) => {
        if (req.url === '/favicon.ico') {
            res.setHeader('Content-Type', 'image/x-icon');
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
            res.sendFile(faviconPath);
        } else {
            next();
        }
    };
}