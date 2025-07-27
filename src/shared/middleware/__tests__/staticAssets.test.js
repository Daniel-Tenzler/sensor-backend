import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { configureStaticAssets, securityHeaders, serveFavicon } from '../staticAssets.js';

describe('Static Assets Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
    });

    describe('configureStaticAssets', () => {
        it('should serve static files with proper headers', async() => {
            app.use(configureStaticAssets());

            const response = await request(app)
                .get('/css/login.css')
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=86400');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['content-type']).toContain('text/css');
        });

        it('should serve JavaScript files with proper headers', async() => {
            app.use(configureStaticAssets());

            const response = await request(app)
                .get('/js/dashboard.js')
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=86400');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['content-type']).toContain('application/javascript');
        });

        it('should set different cache headers for images', async() => {
            app.use(configureStaticAssets());

            const response = await request(app)
                .get('/images/favicon.ico')
                .expect(200);

            expect(response.headers['cache-control']).toBe('public, max-age=604800');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });

        it('should return 404 for non-existent files', async() => {
            app.use(configureStaticAssets());

            await request(app)
                .get('/css/nonexistent.css')
                .expect(404);
        });
    });

    describe('securityHeaders', () => {
        it('should add security headers to responses', async() => {
            app.use(securityHeaders());
            app.get('/test', (req, res) => res.send('test'));

            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['content-security-policy']).toContain("default-src 'self'");
        });

        it('should not add HSTS header in development', async() => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            app.use(securityHeaders());
            app.get('/test', (req, res) => res.send('test'));

            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.headers['strict-transport-security']).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('serveFavicon', () => {
        it('should serve favicon.ico with proper headers', async() => {
            app.use(serveFavicon());

            const response = await request(app)
                .get('/favicon.ico')
                .expect(200);

            expect(response.headers['content-type']).toBe('image/x-icon');
            expect(response.headers['cache-control']).toBe('public, max-age=2592000');
        });

        it('should pass through non-favicon requests', async() => {
            app.use(serveFavicon());
            app.get('/test', (req, res) => res.send('test'));

            await request(app)
                .get('/test')
                .expect(200);
        });
    });

    describe('Integration', () => {
        it('should work together with all middleware', async() => {
            app.use(securityHeaders());
            app.use(serveFavicon());
            app.use(configureStaticAssets());

            const response = await request(app)
                .get('/css/dashboard.css')
                .expect(200);

            // Should have both security headers and static asset headers
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['cache-control']).toBe('public, max-age=86400');
            expect(response.headers['content-type']).toContain('text/css');
        });
    });
});