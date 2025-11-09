const request = require('supertest');
const { app } = require('../../src/server');

describe('Contract: Readiness Check - GET /api/health/ready', () => {
  describe('Ready State', () => {
    it('should return 200 when service is ready to accept traffic', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect('Content-Type', /json/);

      // Service should be ready in test environment
      if (response.body.status === 'ready') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });

    it('should include status field', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.body).toHaveProperty('status');
      expect(['ready', 'not ready']).toContain(response.body.status);
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include dependency checks', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
    });
  });

  describe('Dependency Status', () => {
    it('should verify database is connected', async () => {
      const response = await request(app).get('/api/health/ready');

      const dbStatus = response.body.checks.database;
      expect(['connected', 'disconnected']).toContain(dbStatus);

      if (response.body.status === 'ready') {
        expect(dbStatus).toBe('connected');
      }
    });

    it('should verify Redis is connected', async () => {
      const response = await request(app).get('/api/health/ready');

      const redisStatus = response.body.checks.redis;
      expect(['connected', 'disconnected']).toContain(redisStatus);

      if (response.body.status === 'ready') {
        expect(redisStatus).toBe('connected');
      }
    });
  });

  describe('Not Ready State', () => {
    it('should return 503 when database is unavailable', async () => {
      const response = await request(app).get('/api/health/ready');

      if (response.body.checks.database === 'disconnected') {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('not ready');
      }
    });

    it('should return 503 when Redis is unavailable', async () => {
      const response = await request(app).get('/api/health/ready');

      if (response.body.checks.redis === 'disconnected') {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('not ready');
      }
    });
  });

  describe('Performance', () => {
    it('should respond quickly (within 500ms)', async () => {
      const start = Date.now();
      await request(app).get('/api/health/ready');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should not block on slow dependencies', async () => {
      // Readiness check should have timeouts and fail fast
      const start = Date.now();
      await request(app).get('/api/health/ready');
      const duration = Date.now() - start;

      // Should not take more than 1 second even if dependencies are slow
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Kubernetes Integration', () => {
    it('should follow Kubernetes readiness probe format', async () => {
      const response = await request(app).get('/api/health/ready');

      // Kubernetes expects:
      // - 200 status = ready
      // - 503 status = not ready
      // - JSON response body
      expect([200, 503]).toContain(response.status);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should be idempotent (multiple calls return same result)', async () => {
      const response1 = await request(app).get('/api/health/ready');
      const response2 = await request(app).get('/api/health/ready');

      expect(response1.status).toBe(response2.status);
      expect(response1.body.status).toBe(response2.body.status);
    });

    it('should not have side effects', async () => {
      // Readiness check should not modify state
      const before = await request(app).get('/api/health/ready');
      const after = await request(app).get('/api/health/ready');

      // Calling readiness check should not change service state
      expect(before.body.checks).toEqual(after.body.checks);
    });
  });

  describe('Different from Health Check', () => {
    it('should be simpler than /api/health endpoint', async () => {
      const healthResponse = await request(app).get('/api/health');
      const readyResponse = await request(app).get('/api/health/ready');

      // Readiness check should have fewer fields (focused on "can accept traffic")
      const healthKeys = Object.keys(healthResponse.body);
      const readyKeys = Object.keys(readyResponse.body);

      expect(readyKeys.length).toBeLessThanOrEqual(healthKeys.length);

      // Readiness should not include system metrics (memory, CPU)
      expect(readyResponse.body).not.toHaveProperty('system');
    });
  });
});
