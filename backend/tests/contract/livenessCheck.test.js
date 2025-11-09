const request = require('supertest');
const { app } = require('../../src/server');

describe('Contract: Liveness Check - GET /api/health/live', () => {
  describe('Alive State', () => {
    it('should always return 200 when process is responsive', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'alive');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify timestamp is recent
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const diffMs = now - timestamp;
      expect(diffMs).toBeLessThan(2000);
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should respond extremely fast (within 100ms)', async () => {
      const start = Date.now();
      await request(app).get('/api/health/live');
      const duration = Date.now() - start;

      // Liveness check must be very fast (no dependency checks)
      expect(duration).toBeLessThan(100);
    });

    it('should not check external dependencies', async () => {
      // Liveness check should respond even if dependencies are down
      const start = Date.now();
      const response = await request(app).get('/api/health/live');
      const duration = Date.now() - start;

      // Should respond immediately without waiting for DB/Redis
      expect(duration).toBeLessThan(50);
      expect(response.status).toBe(200);
    });
  });

  describe('Kubernetes Integration', () => {
    it('should follow Kubernetes liveness probe format', async () => {
      const response = await request(app).get('/api/health/live');

      // Kubernetes liveness probe expects:
      // - 200 status = alive
      // - Any other status = dead (restart container)
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should be idempotent (multiple calls return same result)', async () => {
      const response1 = await request(app).get('/api/health/live');
      const response2 = await request(app).get('/api/health/live');

      expect(response1.status).toBe(response2.status);
      expect(response1.body.status).toBe(response2.body.status);
    });

    it('should not have side effects', async () => {
      // Liveness check should not modify state
      const before = await request(app).get('/api/health/live');

      // Make some other requests
      await request(app).get('/api/health');

      const after = await request(app).get('/api/health/live');

      // Liveness should still work the same way
      expect(before.body.status).toBe('alive');
      expect(after.body.status).toBe('alive');
    });
  });

  describe('Different from Readiness Check', () => {
    it('should not check dependencies unlike /api/health/ready', async () => {
      const liveResponse = await request(app).get('/api/health/live');
      const readyResponse = await request(app).get('/api/health/ready');

      // Liveness should not have dependency checks
      expect(liveResponse.body).not.toHaveProperty('checks');
      expect(liveResponse.body).not.toHaveProperty('dependencies');

      // Readiness should have checks
      expect(readyResponse.body).toHaveProperty('checks');
    });

    it('should always return 200 unlike readiness which can return 503', async () => {
      const liveResponse = await request(app).get('/api/health/live');

      // Liveness always returns 200 if process is alive
      expect(liveResponse.status).toBe(200);
    });
  });

  describe('Minimal Response', () => {
    it('should return minimal data (no system metrics)', async () => {
      const response = await request(app).get('/api/health/live');

      // Should only have status, timestamp, uptime
      const keys = Object.keys(response.body);
      expect(keys.length).toBeLessThanOrEqual(3);

      expect(response.body).not.toHaveProperty('system');
      expect(response.body).not.toHaveProperty('dependencies');
      expect(response.body).not.toHaveProperty('version');
    });

    it('should have smaller response size than health check', async () => {
      const healthResponse = await request(app).get('/api/health');
      const liveResponse = await request(app).get('/api/health/live');

      const healthSize = JSON.stringify(healthResponse.body).length;
      const liveSize = JSON.stringify(liveResponse.body).length;

      expect(liveSize).toBeLessThan(healthSize);
    });
  });

  describe('High Frequency Calls', () => {
    it('should handle rapid consecutive calls without degradation', async () => {
      const calls = 10;
      const promises = [];

      for (let i = 0; i < calls; i++) {
        promises.push(request(app).get('/api/health/live'));
      }

      const responses = await Promise.all(promises);

      // All calls should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
      });
    });

    it('should maintain fast response time under load', async () => {
      const calls = 20;
      const durations = [];

      for (let i = 0; i < calls; i++) {
        const start = Date.now();
        await request(app).get('/api/health/live');
        durations.push(Date.now() - start);
      }

      // All calls should be fast
      durations.forEach((duration) => {
        expect(duration).toBeLessThan(100);
      });

      // Average should be very fast
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      expect(avg).toBeLessThan(50);
    });
  });
});
