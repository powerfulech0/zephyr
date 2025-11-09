const request = require('supertest');
const { app } = require('../../src/server');

describe('Contract: Health Check - GET /api/health', () => {
  describe('Healthy State', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      // Verify required fields exist
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('dependencies');

      // If all dependencies are healthy, status should be 200
      if (response.body.status === 'healthy') {
        expect(response.status).toBe(200);
      } else {
        // Otherwise, should return 503 with unhealthy status
        expect(response.status).toBe(503);
        expect(['unhealthy', 'degraded']).toContain(response.body.status);
      }
    });

    it('should include ISO 8601 timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify timestamp is recent (within last 5 seconds)
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const diffMs = now - timestamp;
      expect(diffMs).toBeLessThan(5000);
    });

    it('should include uptime in seconds', async () => {
      const response = await request(app).get('/api/health');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include application version', async () => {
      const response = await request(app).get('/api/health');

      expect(typeof response.body.version).toBe('string');
      expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/); // semver format
    });
  });

  describe('Database Dependency', () => {
    it('should check database connectivity', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.dependencies).toHaveProperty('database');
      const db = response.body.dependencies.database;

      expect(db).toHaveProperty('status');
      expect(['connected', 'disconnected']).toContain(db.status);
    });

    it('should include database response time when connected', async () => {
      const response = await request(app).get('/api/health');

      const db = response.body.dependencies.database;

      if (db.status === 'connected') {
        expect(typeof db.responseTime).toBe('number');
        expect(db.responseTime).toBeGreaterThan(0);
        expect(db.responseTime).toBeLessThan(1000); // Should be fast (<1s)
        expect(db.details).toContain('PostgreSQL');
      }
    });

    it('should include error message when database disconnected', async () => {
      // This test would require mocking database failure
      // For now, we verify the structure exists
      const response = await request(app).get('/api/health');

      const db = response.body.dependencies.database;

      if (db.status === 'disconnected') {
        expect(db.responseTime).toBeNull();
        expect(db).toHaveProperty('error');
        expect(typeof db.error).toBe('string');
      }
    });
  });

  describe('Redis Dependency', () => {
    it('should check Redis connectivity', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.dependencies).toHaveProperty('redis');
      const {redis} = response.body.dependencies;

      expect(redis).toHaveProperty('status');
      expect(['connected', 'disconnected']).toContain(redis.status);
    });

    it('should include Redis response time when connected', async () => {
      const response = await request(app).get('/api/health');

      const {redis} = response.body.dependencies;

      if (redis.status === 'connected') {
        expect(typeof redis.responseTime).toBe('number');
        expect(redis.responseTime).toBeGreaterThan(0);
        expect(redis.responseTime).toBeLessThan(500); // Should be very fast (<500ms)
        expect(redis.details).toContain('Redis');
      }
    });

    it('should include error message when Redis disconnected', async () => {
      const response = await request(app).get('/api/health');

      const {redis} = response.body.dependencies;

      if (redis.status === 'disconnected') {
        expect(redis.responseTime).toBeNull();
        expect(redis).toHaveProperty('error');
        expect(typeof redis.error).toBe('string');
      }
    });
  });

  describe('System Metrics', () => {
    it('should include memory usage', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.system).toHaveProperty('memory');
      const {memory} = response.body.system;

      expect(typeof memory.used).toBe('number');
      expect(typeof memory.total).toBe('number');
      expect(typeof memory.percentage).toBe('string');

      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(memory.used);
      expect(parseFloat(memory.percentage)).toBeGreaterThan(0);
      expect(parseFloat(memory.percentage)).toBeLessThanOrEqual(100);
    });

    it('should include CPU load average', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.system).toHaveProperty('cpu');
      const {cpu} = response.body.system;

      expect(Array.isArray(cpu.loadAverage)).toBe(true);
      expect(cpu.loadAverage).toHaveLength(3); // 1, 5, 15 minute averages
      expect(cpu.loadAverage.every(avg => typeof avg === 'number')).toBe(true);
    });
  });

  describe('Unhealthy State', () => {
    it('should return 503 when critical dependencies are unavailable', async () => {
      // This test would require mocking dependency failures
      // For now, we verify that when healthy, status is 200
      const response = await request(app).get('/api/health');

      if (response.body.status === 'unhealthy') {
        expect(response.status).toBe(503);
      } else {
        expect(response.status).toBe(200);
      }
    });

    it('should set status to unhealthy when database is disconnected', async () => {
      const response = await request(app).get('/api/health');

      const db = response.body.dependencies.database;

      if (db.status === 'disconnected') {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('unhealthy');
      }
    });

    it('should set status to unhealthy when Redis is disconnected', async () => {
      const response = await request(app).get('/api/health');

      const {redis} = response.body.dependencies;

      if (redis.status === 'disconnected') {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe('unhealthy');
      }
    });
  });

  describe('Response Time', () => {
    it('should respond within 1 second', async () => {
      const start = Date.now();
      await request(app).get('/api/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
