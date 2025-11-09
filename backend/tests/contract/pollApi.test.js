const request = require('supertest');
const { Pool } = require('pg');
const { app, httpServer, initializeInfrastructure } = require('../../src/server.js');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/cache');

describe('Poll API Contract Tests', () => {
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

  describe('POST /api/polls', () => {
    it('should create a poll with valid question and options', async () => {
      const payload = {
        question: 'What is your favorite programming language?',
        options: ['JavaScript', 'Python', 'Go', 'Rust'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.roomCode).toBeDefined();
      expect(response.body.roomCode).toHaveLength(6);
      expect(response.body.question).toBe(payload.question);
      expect(response.body.options).toEqual(payload.options);
      expect(response.body.state).toBe('waiting');
    });

    it('should reject request with missing question', async () => {
      const payload = {
        options: ['A', 'B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Question is required');
    });

    it('should reject request with empty question', async () => {
      const payload = {
        question: '',
        options: ['A', 'B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Question must be between 5 and 200 characters');
    });

    it('should reject request with question longer than 200 characters', async () => {
      const payload = {
        question: 'A'.repeat(201),
        options: ['A', 'B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Question must be between 5 and 200 characters');
    });

    it('should reject request with fewer than 2 options', async () => {
      const payload = {
        question: 'Valid question here?',
        options: ['Only one'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Options array must contain 2-5 elements');
    });

    it('should reject request with more than 5 options', async () => {
      const payload = {
        question: 'Valid question here?',
        options: ['A', 'B', 'C', 'D', 'E', 'F'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Options array must contain 2-5 elements');
    });

    it('should reject request with empty option text', async () => {
      const payload = {
        question: 'Valid question here?',
        options: ['Valid', ''],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('must be between 1 and 100 characters');
    });

    it('should reject request with option text longer than 100 characters', async () => {
      const payload = {
        question: 'Valid question here?',
        options: ['Valid', 'X'.repeat(101)],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('must be between 1 and 100 characters');
    });

    it('should reject request with non-array options', async () => {
      const payload = {
        question: 'Valid question here?',
        options: 'not an array',
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Options must be an array');
    });
  });

  describe('GET /api/polls/:roomCode', () => {
    let createdPoll;

    beforeEach(async () => {
      const payload = {
        question: 'Setup test poll for retrieval',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app).post('/api/polls').send(payload);
      createdPoll = response.body;
    });

    it('should return poll data for valid room code', async () => {
      const response = await request(app)
        .get(`/api/polls/${createdPoll.roomCode}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.roomCode).toBe(createdPoll.roomCode);
      expect(response.body.question).toBe(createdPoll.question);
      expect(response.body.options).toEqual(createdPoll.options);
      expect(response.body.state).toBe('waiting');
      expect(response.body.participantCount).toBeDefined();
      expect(response.body.votes).toBeDefined();
      expect(response.body.percentages).toBeDefined();
    });

    it('should return 404 for non-existent room code', async () => {
      const response = await request(app)
        .get('/api/polls/FAKE99')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.error).toContain('Poll not found');
    });

    it('should return 400 for invalid room code format', async () => {
      const response = await request(app)
        .get('/api/polls/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.error).toContain('Room code must be exactly 6 characters');
    });

    it('should not expose internal implementation details', async () => {
      const response = await request(app).get(`/api/polls/${createdPoll.roomCode}`).expect(200);

      // Should not expose database IDs, internal maps, etc.
      expect(response.body.id).toBeUndefined();
      expect(response.body.poll_id).toBeUndefined();
      expect(response.body.hostSocketId).toBeUndefined();
      expect(response.body.socketRoomMap).toBeUndefined();
    });
  });
});
