const request = require('supertest');
const { Pool } = require('pg');
const app = require('../../src/server');

describe('Contract: Poll Persistence', () => {
  let dbPool;
  let server;

  beforeAll(async () => {
    // Initialize database connection for test verification
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zephyr_test',
      user: process.env.DB_USER || 'zephyr',
      password: process.env.DB_PASSWORD || 'zephyr_test_password',
    });

    // Start the server
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    // Clean up
    await dbPool.end();
    await server.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dbPool.query('TRUNCATE TABLE votes, participants, polls RESTART IDENTITY CASCADE');
  });

  describe('POST /api/polls - Create Poll with Database Persistence', () => {
    it('should create a poll and persist it to the database', async () => {
      // Arrange
      const pollData = {
        question: 'What is your favorite programming language?',
        options: ['JavaScript', 'Python', 'Go', 'Rust'],
      };

      // Act
      const response = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect('Content-Type', /json/)
        .expect(201);

      // Assert - API response
      expect(response.body).toHaveProperty('roomCode');
      expect(response.body).toHaveProperty('question', pollData.question);
      expect(response.body).toHaveProperty('options', pollData.options);
      expect(response.body).toHaveProperty('state', 'waiting');
      expect(response.body.roomCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);

      // Assert - Database persistence
      const dbResult = await dbPool.query(
        'SELECT * FROM polls WHERE room_code = $1',
        [response.body.roomCode]
      );

      expect(dbResult.rows).toHaveLength(1);
      const savedPoll = dbResult.rows[0];
      expect(savedPoll.question).toBe(pollData.question);
      expect(savedPoll.options).toEqual(pollData.options);
      expect(savedPoll.state).toBe('waiting');
      expect(savedPoll.is_active).toBe(true);
      expect(savedPoll.created_at).toBeDefined();
      expect(savedPoll.expires_at).toBeDefined();
    });

    it('should enforce unique room codes in database', async () => {
      // Arrange
      const pollData = {
        question: 'Test poll for uniqueness?',
        options: ['Yes', 'No'],
      };

      // Act - Create first poll
      const response1 = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      const roomCode1 = response1.body.roomCode;

      // Act - Create second poll (should get different room code)
      const response2 = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      const roomCode2 = response2.body.roomCode;

      // Assert - Different room codes
      expect(roomCode1).not.toBe(roomCode2);

      // Assert - Both persisted in database
      const dbResult = await dbPool.query('SELECT COUNT(*) FROM polls WHERE is_active = true');
      expect(parseInt(dbResult.rows[0].count, 10)).toBe(2);
    });

    it('should reject invalid poll data with validation errors', async () => {
      // Arrange - Invalid: question too short
      const invalidPoll = {
        question: 'Hi?',
        options: ['Yes', 'No'],
      };

      // Act & Assert
      const response = await request(server)
        .post('/api/polls')
        .send(invalidPoll)
        .expect(400);

      expect(response.body).toHaveProperty('error');

      // Assert - No database entry created
      const dbResult = await dbPool.query('SELECT COUNT(*) FROM polls');
      expect(parseInt(dbResult.rows[0].count, 10)).toBe(0);
    });

    it('should reject poll with too few options', async () => {
      // Arrange - Invalid: only 1 option (need 2-5)
      const invalidPoll = {
        question: 'Valid question here?',
        options: ['Only one option'],
      };

      // Act & Assert
      await request(server)
        .post('/api/polls')
        .send(invalidPoll)
        .expect(400);

      // Assert - No database entry created
      const dbResult = await dbPool.query('SELECT COUNT(*) FROM polls');
      expect(parseInt(dbResult.rows[0].count, 10)).toBe(0);
    });

    it('should reject poll with too many options', async () => {
      // Arrange - Invalid: 6 options (max 5)
      const invalidPoll = {
        question: 'Which option do you prefer?',
        options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
      };

      // Act & Assert
      await request(server)
        .post('/api/polls')
        .send(invalidPoll)
        .expect(400);

      // Assert - No database entry created
      const dbResult = await dbPool.query('SELECT COUNT(*) FROM polls');
      expect(parseInt(dbResult.rows[0].count, 10)).toBe(0);
    });
  });

  describe('GET /api/polls/:roomCode - Retrieve Persisted Poll', () => {
    it('should retrieve poll from database by room code', async () => {
      // Arrange - Create poll via API
      const pollData = {
        question: 'Test retrieval?',
        options: ['A', 'B', 'C'],
      };

      const createResponse = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      const roomCode = createResponse.body.roomCode;

      // Act - Retrieve poll
      const getResponse = await request(server)
        .get(`/api/polls/${roomCode}`)
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(getResponse.body).toHaveProperty('roomCode', roomCode);
      expect(getResponse.body).toHaveProperty('question', pollData.question);
      expect(getResponse.body).toHaveProperty('options', pollData.options);
      expect(getResponse.body).toHaveProperty('state', 'waiting');
    });

    it('should return 404 for non-existent room code', async () => {
      // Arrange
      const nonExistentRoomCode = 'XXXXXX';

      // Act & Assert
      await request(server)
        .get(`/api/polls/${nonExistentRoomCode}`)
        .expect(404);
    });

    it('should not retrieve soft-deleted polls', async () => {
      // Arrange - Create poll
      const pollData = {
        question: 'To be deleted?',
        options: ['Yes', 'No'],
      };

      const createResponse = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      const roomCode = createResponse.body.roomCode;

      // Soft delete the poll directly in database
      await dbPool.query(
        'UPDATE polls SET is_active = false WHERE room_code = $1',
        [roomCode]
      );

      // Act & Assert
      await request(server)
        .get(`/api/polls/${roomCode}`)
        .expect(404);
    });
  });

  describe('Data Retention and Expiration', () => {
    it('should set expiration date 30 days from creation by default', async () => {
      // Arrange
      const pollData = {
        question: 'Will this expire?',
        options: ['Yes', 'No'],
      };

      // Act
      const response = await request(server)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      // Assert - Check database expiration
      const dbResult = await dbPool.query(
        'SELECT created_at, expires_at FROM polls WHERE room_code = $1',
        [response.body.roomCode]
      );

      const { created_at, expires_at } = dbResult.rows[0];
      const createdDate = new Date(created_at);
      const expiresDate = new Date(expires_at);

      const daysDiff = Math.round((expiresDate - createdDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });
  });
});
