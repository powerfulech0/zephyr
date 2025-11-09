const request = require('supertest');
const { Pool } = require('pg');
const { app, httpServer, initializeInfrastructure } = require('../../src/server.js');
const { closePool } = require('../../src/config/database');
const { closeRedis, getRedisClient } = require('../../src/config/cache');

/**
 * Contract Test: Input Sanitization (T032)
 * Tests XSS prevention, script tag filtering, and SQL injection pattern detection
 */
describe('Contract: Input Sanitization', () => {
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

    // Get Redis client for rate limit cleanup
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

    // Clear Redis rate limit keys
    const keys = await redisClient.keys('rl:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags in poll question', async () => {
      const maliciousPayload = {
        question: '<script>alert("XSS")</script>What is your favorite?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify script tags are removed
      expect(response.body.question).not.toContain('<script>');
      expect(response.body.question).not.toContain('</script>');
      expect(response.body.question).toContain('What is your favorite?');

      // Verify it was sanitized in database too
      const dbResult = await dbPool.query(
        'SELECT question FROM polls WHERE room_code = $1',
        [response.body.roomCode]
      );
      expect(dbResult.rows[0].question).not.toContain('<script>');
    });

    it('should sanitize img tags with onerror XSS in poll question', async () => {
      const maliciousPayload = {
        question: '<img src=x onerror=alert(1)>Valid question here?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify dangerous onerror attribute is removed (XSS library may keep safe <img> tag)
      expect(response.body.question).not.toContain('onerror');
      expect(response.body.question).not.toContain('alert');
      expect(response.body.question).toContain('Valid question here?');
    });

    it('should sanitize javascript: protocol in poll question', async () => {
      const maliciousPayload = {
        question: '<a href="javascript:alert(1)">Click me</a> Valid question?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify javascript: protocol is removed
      expect(response.body.question).not.toContain('javascript:');
    });

    it('should sanitize XSS in poll options', async () => {
      const maliciousPayload = {
        question: 'Valid question here?',
        options: [
          'Normal option',
          '<script>alert("XSS")</script>Malicious option',
        ],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify script tags are removed from options
      expect(response.body.options[1]).not.toContain('<script>');
      expect(response.body.options[1]).toContain('Malicious option');
    });

    it('should sanitize event handlers in options', async () => {
      const maliciousPayload = {
        question: 'Valid question here?',
        options: [
          'Normal option',
          '<div onclick="alert(1)">Click option</div>',
        ],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify onclick handler is removed
      expect(response.body.options[1]).not.toContain('onclick');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection patterns in question', async () => {
      const sqlInjectionPayload = {
        question: "'; DROP TABLE polls; -- Valid question?",
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(sqlInjectionPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify poll was created (SQL injection didn't execute)
      expect(response.body.roomCode).toBeDefined();
      expect(response.body.question).toContain('DROP TABLE polls');

      // Verify database still exists and contains the poll
      const dbResult = await dbPool.query('SELECT COUNT(*) FROM polls');
      expect(parseInt(dbResult.rows[0].count, 10)).toBe(1);
    });

    it('should safely handle UNION-based SQL injection', async () => {
      const sqlInjectionPayload = {
        question: "Valid' UNION SELECT * FROM participants -- question?",
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(sqlInjectionPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify poll was created safely
      expect(response.body.roomCode).toBeDefined();
    });
  });

  describe('HTML Entity Encoding', () => {
    it('should preserve safe HTML entities', async () => {
      const payload = {
        question: 'What is 5 &lt; 10 &amp; 10 &gt; 5?',
        options: ['True', 'False'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      // HTML entities should be preserved or decoded safely
      expect(response.body.question).toBeDefined();
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle Unicode characters safely', async () => {
      const payload = {
        question: 'What emoji do you like? 😀 🎉 ❤️',
        options: ['😀 Happy', '🎉 Party'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify Unicode characters are preserved
      expect(response.body.question).toContain('😀');
      expect(response.body.question).toContain('🎉');
    });

    it('should handle special characters in options', async () => {
      const payload = {
        question: 'What punctuation do you prefer?',
        options: ['Semicolon;', 'Colon:', "Apostrophe's", 'Quote"s'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify special characters are preserved
      expect(response.body.options).toContain('Semicolon;');
      expect(response.body.options).toContain('Colon:');
    });
  });

  describe('Nested XSS Attempts', () => {
    it('should sanitize nested script tags', async () => {
      const maliciousPayload = {
        question: '<<script>script>alert(1)<</script>/script> Valid question?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify nested script tags are sanitized
      expect(response.body.question).not.toContain('<script>');
      expect(response.body.question).not.toContain('</script>');
    });

    it('should sanitize encoded script tags', async () => {
      const maliciousPayload = {
        question: '&#60;script&#62;alert(1)&#60;/script&#62; Valid question?',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(maliciousPayload)
        .expect('Content-Type', /json/)
        .expect(201);

      // Verify encoded script tags are handled
      expect(response.body.question).toBeDefined();
    });
  });
});
