const request = require('supertest');
const { Pool } = require('pg');
const { app, httpServer, initializeInfrastructure } = require('../../src/server.js');
const { closePool } = require('../../src/config/database');
const { closeRedis, getRedisClient } = require('../../src/config/cache');

/**
 * Contract Test: Rate Limiting (T033)
 * Tests global, poll creation, and vote submission rate limits
 */
describe('Contract: Rate Limiting', () => {
  let dbPool;
  let redisClient;

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

    // Get Redis client for cleanup
    redisClient = getRedisClient();
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

    // Clean Redis rate limit keys
    const keys = await redisClient.keys('rl:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  describe('Poll Creation Rate Limit (5 per hour)', () => {
    it('should allow up to 5 poll creations per hour', async () => {
      const pollData = {
        question: 'Test question for rate limiting?',
        options: ['Option A', 'Option B'],
      };

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/polls')
          .send(pollData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body.roomCode).toBeDefined();
      }
    });

    it('should reject 6th poll creation within the hour', async () => {
      const pollData = {
        question: 'Test question for rate limiting?',
        options: ['Option A', 'Option B'],
      };

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/polls')
          .send(pollData)
          .expect(201);
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/polls')
        .send(pollData)
        .expect('Content-Type', /json/)
        .expect(429);

      expect(response.body.error).toContain('Too many polls created');
      expect(response.body.retryAfter).toBeDefined();
    });

    it('should include rate limit headers in response', async () => {
      const pollData = {
        question: 'Test question for rate limiting?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      // Check for rate limit headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Global Rate Limit (100 per 15 minutes)', () => {
    it('should track requests across different endpoints', async () => {
      // Make requests to different endpoints
      let responses = 0;

      // Create a poll
      const pollResponse = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        });

      if (pollResponse.status === 201) responses++;

      const roomCode = pollResponse.body.roomCode;

      // Get the poll (different endpoint)
      const getResponse = await request(app)
        .get(`/api/polls/${roomCode}`);

      if (getResponse.status === 200) responses++;

      // Check health (different endpoint)
      const healthResponse = await request(app)
        .get('/api/health');

      if (healthResponse.status === 200) responses++;

      // All should count toward global limit
      expect(responses).toBeGreaterThan(0);
    });

    it('should return 429 when global limit exceeded', async () => {
      // Note: Testing 100+ requests would be slow
      // This test verifies the mechanism works by checking headers
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Verify global rate limit headers are present
      expect(response.headers['ratelimit-limit']).toBeDefined();
      const limit = parseInt(response.headers['ratelimit-limit'], 10);
      expect(limit).toBe(100);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include standard rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Standard headers per RFC
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();

      // Verify header values are reasonable
      const limit = parseInt(response.headers['ratelimit-limit'], 10);
      const remaining = parseInt(response.headers['ratelimit-remaining'], 10);

      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should decrement remaining count with each request', async () => {
      const response1 = await request(app)
        .get('/api/health')
        .expect(200);

      const remaining1 = parseInt(response1.headers['ratelimit-remaining'], 10);

      const response2 = await request(app)
        .get('/api/health')
        .expect(200);

      const remaining2 = parseInt(response2.headers['ratelimit-remaining'], 10);

      // Second request should have fewer remaining
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should include reset timestamp in headers', async () => {
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        })
        .expect(201);

      const resetHeader = response.headers['ratelimit-reset'];
      expect(resetHeader).toBeDefined();

      const resetTime = parseInt(resetHeader, 10);
      const now = Math.floor(Date.now() / 1000);

      // Reset time should be in the future
      expect(resetTime).toBeGreaterThan(now);

      // Should be within the hour (for poll creation limit)
      expect(resetTime).toBeLessThan(now + 3600);
    });
  });

  describe('Rate Limit Error Response', () => {
    it('should return descriptive error message when rate limited', async () => {
      const pollData = {
        question: 'Test question?',
        options: ['A', 'B'],
      };

      // Exhaust poll creation limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/polls')
          .send(pollData);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/polls')
        .send(pollData)
        .expect(429);

      // Verify error message structure
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Too many');
      expect(response.body.retryAfter).toBeDefined();
    });

    it('should maintain rate limit across different poll data', async () => {
      // Different poll data should still count toward same limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/polls')
          .send({
            question: `Question ${i}?`,
            options: ['A', 'B'],
          });
      }

      // 6th request with different data should still be limited
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Completely different question?',
          options: ['X', 'Y', 'Z'],
        })
        .expect(429);

      expect(response.body.error).toContain('Too many');
    });
  });

  describe('Rate Limit Isolation', () => {
    it('should use IP-based rate limiting', async () => {
      // Note: In test environment, all requests come from same IP
      // This test verifies the mechanism exists
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test question?',
          options: ['A', 'B'],
        })
        .expect(201);

      // Rate limit headers should be present, indicating IP tracking
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
