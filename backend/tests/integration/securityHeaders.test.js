const request = require('supertest');
const { Pool } = require('pg');
const { app, httpServer, initializeInfrastructure } = require('../../src/server.js');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/cache');

/**
 * Integration Test: Security Headers (T035)
 * Tests security headers set by helmet.js middleware
 */
describe('Integration: Security Headers', () => {
  let dbPool;

  beforeAll(async () => {
    // Initialize infrastructure
    await initializeInfrastructure();

    // Initialize database connection for cleanup
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zephyr_dev',
      user: process.env.DB_USER || 'zephyr',
      password: process.env.DB_PASSWORD || 'zephyr_dev_password',
    });
  });

  afterAll(async () => {
    await dbPool.end();
    await closePool();
    await closeRedis();

    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
  });

  beforeEach(async () => {
    // Clean database before each test
    await dbPool.query('TRUNCATE TABLE votes, participants, polls RESTART IDENTITY CASCADE');
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set CSP header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should restrict default-src to self', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
    });

    it('should restrict script-src to self', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self'");
    });

    it('should disallow object-src', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("object-src 'none'");
    });

    it('should disallow frame-src', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("frame-src 'none'");
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should prevent clickjacking attacks', async () => {
      // X-Frame-Options: DENY prevents the page from being displayed in iframe
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent MIME type sniffing', async () => {
      // Prevents browsers from MIME-sniffing a response away from declared content-type
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set HSTS header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should enforce HTTPS for at least 1 year', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=');

      // Extract max-age value
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();

      const maxAge = parseInt(maxAgeMatch[1], 10);
      const oneYear = 31536000; // seconds in a year

      expect(maxAge).toBeGreaterThanOrEqual(oneYear);
    });

    it('should include subdomains', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('includeSubDomains');
    });

    it('should include preload directive', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('preload');
    });
  });

  describe('X-Powered-By', () => {
    it('should hide X-Powered-By header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should not reveal Express
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should not reveal technology stack', async () => {
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        });

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('X-DNS-Prefetch-Control', () => {
    it('should disable DNS prefetching', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('X-Download-Options', () => {
    it('should set X-Download-Options to noopen', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Prevents IE from executing downloads in site context
      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('X-Permitted-Cross-Domain-Policies', () => {
    it('should set cross-domain policy to none', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    });
  });

  describe('Security Headers on All Endpoints', () => {
    it('should include security headers on GET requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Verify all key security headers present
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include security headers on POST requests', async () => {
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        });

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include security headers on error responses', async () => {
      const response = await request(app)
        .get('/api/polls/INVALID'); // Returns 400 due to room code validation

      // Even error responses should have security headers
      expect(response.status).toBeGreaterThanOrEqual(400); // 400 or 404 both are errors
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should include security headers on OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('Security Best Practices', () => {
    it('should not leak server information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should not reveal server software
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should prevent common attack vectors', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for key defensive headers
      const headers = response.headers;

      // XSS protection
      expect(headers['content-security-policy']).toBeDefined();

      // Clickjacking protection
      expect(headers['x-frame-options']).toBe('DENY');

      // MIME sniffing protection
      expect(headers['x-content-type-options']).toBe('nosniff');

      // HTTPS enforcement
      expect(headers['strict-transport-security']).toBeDefined();
    });
  });
});
