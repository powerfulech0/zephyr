const request = require('supertest');
const { app, httpServer } = require('../../src/server.js');

describe('Poll API Contract Tests', () => {
  afterAll(done => {
    httpServer.close(done);
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

      expect(response.body.success).toBe(true);
      expect(response.body.poll).toBeDefined();
      expect(response.body.poll.roomCode).toBeDefined();
      expect(response.body.poll.roomCode).toHaveLength(6);
      expect(response.body.poll.question).toBe(payload.question);
      expect(response.body.poll.options).toEqual(payload.options);
      expect(response.body.poll.state).toBe('waiting');
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

      expect(response.body.success).toBe(false);
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

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Question must be between 1 and 500 characters');
    });

    it('should reject request with question longer than 500 characters', async () => {
      const payload = {
        question: 'A'.repeat(501),
        options: ['A', 'B'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Question must be between 1 and 500 characters');
    });

    it('should reject request with fewer than 2 options', async () => {
      const payload = {
        question: 'Test?',
        options: ['Only one'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Options array must contain 2-5 elements');
    });

    it('should reject request with more than 5 options', async () => {
      const payload = {
        question: 'Test?',
        options: ['A', 'B', 'C', 'D', 'E', 'F'],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Options array must contain 2-5 elements');
    });

    it('should reject request with empty option text', async () => {
      const payload = {
        question: 'Test?',
        options: ['Valid', ''],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be between 1 and 100 characters');
    });

    it('should reject request with option text longer than 100 characters', async () => {
      const payload = {
        question: 'Test?',
        options: ['Valid', 'X'.repeat(101)],
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be between 1 and 100 characters');
    });

    it('should reject request with non-array options', async () => {
      const payload = {
        question: 'Test?',
        options: 'not an array',
      };

      const response = await request(app)
        .post('/api/polls')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Options must be an array');
    });
  });

  describe('GET /api/polls/:roomCode', () => {
    let createdPoll;

    beforeEach(async () => {
      const payload = {
        question: 'Setup test poll',
        options: ['Option A', 'Option B'],
      };

      const response = await request(app).post('/api/polls').send(payload);
      createdPoll = response.body.poll;
    });

    it('should return poll data for valid room code', async () => {
      const response = await request(app)
        .get(`/api/polls/${createdPoll.roomCode}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.poll).toBeDefined();
      expect(response.body.poll.roomCode).toBe(createdPoll.roomCode);
      expect(response.body.poll.question).toBe(createdPoll.question);
      expect(response.body.poll.options).toEqual(createdPoll.options);
      expect(response.body.poll.state).toBe('waiting');
    });

    it('should return 404 for non-existent room code', async () => {
      const response = await request(app)
        .get('/api/polls/FAKE99')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Poll not found');
    });

    it('should return 400 for invalid room code format', async () => {
      const response = await request(app)
        .get('/api/polls/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Room code must be exactly 6 characters');
    });

    it('should not expose internal implementation details', async () => {
      const response = await request(app).get(`/api/polls/${createdPoll.roomCode}`).expect(200);

      // Should not expose hostSocketId, internal maps, etc.
      expect(response.body.poll.hostSocketId).toBeUndefined();
      expect(response.body.poll.socketRoomMap).toBeUndefined();
    });
  });
});
