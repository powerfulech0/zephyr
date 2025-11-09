const io = require('socket.io-client');
const { Pool } = require('pg');
const app = require('../../src/server');

describe('Contract: Vote Persistence', () => {
  let dbPool;
  let server;
  let serverPort;
  let clientSocket;

  beforeAll(async () => {
    // Initialize database connection for test verification
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zephyr_test',
      user: process.env.DB_USER || 'zephyr',
      password: process.env.DB_PASSWORD || 'zephyr_test_password',
    });

    // Start the server on a random port
    server = app.listen(0);
    serverPort = server.address().port;
  });

  afterAll(async () => {
    await dbPool.end();
    await server.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dbPool.query('TRUNCATE TABLE votes, participants, polls RESTART IDENTITY CASCADE');
  });

  afterEach(() => {
    // Disconnect client socket if connected
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Vote Submission and Persistence', () => {
    it('should persist vote to database when participant submits vote', async () => {
      // Arrange - Create poll in database
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['ABC123', 'Test question?', JSON.stringify(['A', 'B', 'C']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Create participant in database
      const participantResult = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname)
         VALUES ($1, $2)
         RETURNING id`,
        [pollId, 'Alice']
      );
      const participantId = participantResult.rows[0].id;

      // Connect WebSocket client
      clientSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Act - Submit vote
      const votePromise = new Promise((resolve) => {
        clientSocket.on('vote-update', resolve);
      });

      clientSocket.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 1,
      });

      await votePromise;

      // Assert - Vote persisted in database
      const voteResult = await dbPool.query(
        'SELECT * FROM votes WHERE participant_id = $1',
        [participantId]
      );

      expect(voteResult.rows).toHaveLength(1);
      const savedVote = voteResult.rows[0];
      expect(savedVote.participant_id).toBe(participantId);
      expect(savedVote.option_index).toBe(1);
      expect(savedVote.voted_at).toBeDefined();
      expect(savedVote.updated_at).toBeDefined();
    });

    it('should update existing vote when participant changes vote (upsert)', async () => {
      // Arrange - Create poll and participant
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['DEF456', 'Change vote test?', JSON.stringify(['X', 'Y', 'Z']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      const participantResult = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname)
         VALUES ($1, $2)
         RETURNING id`,
        [pollId, 'Bob']
      );
      const participantId = participantResult.rows[0].id;

      // Submit initial vote
      await dbPool.query(
        `INSERT INTO votes (participant_id, option_index)
         VALUES ($1, $2)`,
        [participantId, 0]
      );

      // Connect WebSocket
      clientSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Act - Change vote
      const votePromise = new Promise((resolve) => {
        clientSocket.on('vote-update', resolve);
      });

      clientSocket.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 2,
      });

      await votePromise;

      // Assert - Only one vote record, but updated
      const voteResult = await dbPool.query(
        'SELECT * FROM votes WHERE participant_id = $1',
        [participantId]
      );

      expect(voteResult.rows).toHaveLength(1);
      const updatedVote = voteResult.rows[0];
      expect(updatedVote.option_index).toBe(2);
      expect(new Date(updatedVote.updated_at).getTime())
        .toBeGreaterThan(new Date(updatedVote.voted_at).getTime());
    });

    it('should reject vote with invalid option index', async () => {
      // Arrange
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['GHI789', 'Valid options?', JSON.stringify(['One', 'Two']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      const participantResult = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname)
         VALUES ($1, $2)
         RETURNING id`,
        [pollId, 'Charlie']
      );
      const participantId = participantResult.rows[0].id;

      // Connect WebSocket
      clientSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Act - Submit vote with out-of-range option (only 0-1 valid, trying 5)
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('error-message', resolve);
      });

      clientSocket.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 5,
      });

      const error = await errorPromise;

      // Assert - Error received, no vote persisted
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid option');

      const voteResult = await dbPool.query(
        'SELECT * FROM votes WHERE participant_id = $1',
        [participantId]
      );
      expect(voteResult.rows).toHaveLength(0);
    });

    it('should not allow voting when poll is closed', async () => {
      // Arrange - Create closed poll
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['JKL012', 'Closed poll?', JSON.stringify(['Yes', 'No']), 'closed']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      const participantResult = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname)
         VALUES ($1, $2)
         RETURNING id`,
        [pollId, 'Diana']
      );
      const participantId = participantResult.rows[0].id;

      // Connect WebSocket
      clientSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Act - Attempt to vote on closed poll
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('error-message', resolve);
      });

      clientSocket.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 0,
      });

      const error = await errorPromise;

      // Assert - Error received, no vote persisted
      expect(error).toBeDefined();
      expect(error.message).toContain('closed');

      const voteResult = await dbPool.query(
        'SELECT * FROM votes WHERE participant_id = $1',
        [participantId]
      );
      expect(voteResult.rows).toHaveLength(0);
    });
  });

  describe('Vote Retrieval and Aggregation', () => {
    it('should retrieve vote counts from database for a poll', async () => {
      // Arrange - Create poll with multiple participants and votes
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['MNO345', 'Favorite color?', JSON.stringify(['Red', 'Blue', 'Green']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Add participants
      const participant1 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'Eve']
      );
      const participant2 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'Frank']
      );
      const participant3 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'Grace']
      );

      // Add votes (2 votes for option 0, 1 vote for option 1)
      await dbPool.query(
        'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
        [participant1.rows[0].id, 0]
      );
      await dbPool.query(
        'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
        [participant2.rows[0].id, 0]
      );
      await dbPool.query(
        'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
        [participant3.rows[0].id, 1]
      );

      // Act - Query vote counts via aggregation query
      const voteCounts = await dbPool.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index
         ORDER BY v.option_index`,
        [pollId]
      );

      // Assert
      expect(voteCounts.rows).toHaveLength(2);
      expect(voteCounts.rows[0]).toMatchObject({ option_index: 0, count: '2' });
      expect(voteCounts.rows[1]).toMatchObject({ option_index: 1, count: '1' });
    });

    it('should calculate vote percentages correctly', async () => {
      // Arrange - Create poll with votes
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['PQR678', 'Test percentages?', JSON.stringify(['A', 'B']), 'open']
      );
      const pollId = pollResult.rows[0].id;

      // Add 4 participants
      const p1 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'User1']
      );
      const p2 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'User2']
      );
      const p3 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'User3']
      );
      const p4 = await dbPool.query(
        'INSERT INTO participants (poll_id, nickname) VALUES ($1, $2) RETURNING id',
        [pollId, 'User4']
      );

      // 3 votes for option 0, 1 vote for option 1 (75% vs 25%)
      await dbPool.query('INSERT INTO votes (participant_id, option_index) VALUES ($1, 0)', [p1.rows[0].id]);
      await dbPool.query('INSERT INTO votes (participant_id, option_index) VALUES ($1, 0)', [p2.rows[0].id]);
      await dbPool.query('INSERT INTO votes (participant_id, option_index) VALUES ($1, 0)', [p3.rows[0].id]);
      await dbPool.query('INSERT INTO votes (participant_id, option_index) VALUES ($1, 1)', [p4.rows[0].id]);

      // Act - Calculate percentages
      const totalVotes = await dbPool.query(
        `SELECT COUNT(*) as total
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1`,
        [pollId]
      );

      const total = parseInt(totalVotes.rows[0].total, 10);

      const voteCounts = await dbPool.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index`,
        [pollId]
      );

      const percentages = voteCounts.rows.map((row) => ({
        optionIndex: row.option_index,
        percentage: (parseInt(row.count, 10) / total) * 100,
      }));

      // Assert
      expect(total).toBe(4);
      expect(percentages).toContainEqual({ optionIndex: 0, percentage: 75 });
      expect(percentages).toContainEqual({ optionIndex: 1, percentage: 25 });
    });
  });
});
