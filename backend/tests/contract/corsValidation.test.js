const request = require('supertest');
const { Pool } = require('pg');
const { app, httpServer, initializeInfrastructure } = require('../../src/server.js');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/cache');

/**
 * Contract Test: CORS Validation (T034)
 * Tests Cross-Origin Resource Sharing configuration and security
 */
describe('Contract: CORS Validation', () => {
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

  describe('Allowed Origins', () => {
    it('should allow requests from localhost:3000', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow requests from 127.0.0.1:3000', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://127.0.0.1:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });
  });

  describe('Disallowed Origins', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com');

      // CORS middleware should not set allow-origin for unauthorized origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject requests from different ports', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:4000');

      // Should not allow different port
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should reject requests from different protocols', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://localhost:3000');

      // Should not allow HTTPS when HTTP is configured (or vice versa)
      // Note: In production, this should be HTTPS
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    it('should include Access-Control-Allow-Credentials', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should specify allowed methods', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('OPTIONS');
    });

    it('should specify allowed headers', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders.toLowerCase()).toContain('content-type');
    });
  });

  describe('Preflight Requests', () => {
    it('should handle OPTIONS preflight for POST requests', async () => {
      const response = await request(app)
        .options('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should handle OPTIONS preflight for GET requests', async () => {
      const response = await request(app)
        .options('/api/polls/ABC123')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Actual Requests', () => {
    it('should include CORS headers in actual GET requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include CORS headers in actual POST requests', async () => {
      const response = await request(app)
        .post('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        })
        .expect(201);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Security Restrictions', () => {
    it('should not allow wildcard origin when credentials are true', async () => {
      // With credentials: true, origin cannot be *
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      // Should be specific origin, not wildcard
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should only allow configured origins', async () => {
      const unauthorizedOrigins = [
        'http://evil.com',
        'http://localhost:8080',
        'https://localhost:3000',
        'http://127.0.0.1:8000',
      ];

      for (const origin of unauthorizedOrigins) {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', origin);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });
  });

  describe('Environment-Based Configuration', () => {
    it('should respect allowed origins from configuration', async () => {
      // Default configuration allows localhost:3000 and 127.0.0.1:3000
      const response1 = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response1.headers['access-control-allow-origin']).toBe('http://localhost:3000');

      const response2 = await request(app)
        .get('/api/health')
        .set('Origin', 'http://127.0.0.1:3000');

      expect(response2.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    });
  });

  describe('Cross-Origin Requests from Browser', () => {
    it('should allow cross-origin requests with proper headers', async () => {
      // Simulate a cross-origin request from a browser
      const response = await request(app)
        .post('/api/polls')
        .set('Origin', 'http://localhost:3000')
        .set('Referer', 'http://localhost:3000/create-poll')
        .send({
          question: 'Cross-origin test?',
          options: ['Yes', 'No'],
        })
        .expect(201);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.body.roomCode).toBeDefined();
    });
  });
});
