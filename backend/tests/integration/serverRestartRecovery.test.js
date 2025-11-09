const request = require('supertest');
const io = require('socket.io-client');
const { Pool } = require('pg');
const { spawn } = require('child_process');
const path = require('path');

describe('Integration: Server Restart Recovery', () => {
  let dbPool;

  beforeAll(async () => {
    // Initialize database connection
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zephyr_test',
      user: process.env.DB_USER || 'zephyr',
      password: process.env.DB_PASSWORD || 'zephyr_test_password',
    });
  });

  afterAll(async () => {
    await dbPool.end();
  });

  beforeEach(async () => {
    // Clean database
    await dbPool.query('TRUNCATE TABLE votes, participants, polls RESTART IDENTITY CASCADE');
  });

  describe('Poll Data Restoration After Restart', () => {
    it('should restore poll data from database after server restart', async () => {
      // Arrange - Insert poll data directly into database (simulating pre-restart state)
      const pollData = {
        roomCode: 'REST01',
        question: 'Will this survive restart?',
        options: ['Yes', 'No', 'Maybe'],
        state: 'open',
      };

      await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)`,
        [pollData.roomCode, pollData.question, JSON.stringify(pollData.options), pollData.state]
      );

      // Act - Start server (simulating restart)
      const app = require('../../src/server');
      const server = app.listen(0);
      const serverPort = server.address().port;

      // Small delay to allow server initialization
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - Poll data retrievable via API
      const response = await request(server)
        .get(`/api/polls/${pollData.roomCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('roomCode', pollData.roomCode);
      expect(response.body).toHaveProperty('question', pollData.question);
      expect(response.body).toHaveProperty('options', pollData.options);
      expect(response.body).toHaveProperty('state', pollData.state);

      // Cleanup
      await server.close();
    });

    it('should restore participant and vote data after server restart', async () => {
      // Arrange - Create poll with participants and votes
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['REST02', 'Vote recovery test?', JSON.stringify(['A', 'B', 'C']), 'open']
      );
      const pollId = pollResult.rows[0].id;

      // Add participants
      const p1 = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname, is_connected)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [pollId, 'Alice', false]
      );
      const p2 = await dbPool.query(
        `INSERT INTO participants (poll_id, nickname, is_connected)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [pollId, 'Bob', false]
      );

      // Add votes
      await dbPool.query(
        'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
        [p1.rows[0].id, 0]
      );
      await dbPool.query(
        'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
        [p2.rows[0].id, 1]
      );

      // Act - Start server (simulating restart)
      const app = require('../../src/server');
      const server = app.listen(0);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - Poll returns with participant count and votes
      const response = await request(server)
        .get('/api/polls/REST02')
        .expect(200);

      expect(response.body).toHaveProperty('participantCount', 2);
      expect(response.body).toHaveProperty('votes');
      expect(response.body.votes).toHaveProperty('0', 1); // 1 vote for option 0
      expect(response.body.votes).toHaveProperty('1', 1); // 1 vote for option 1

      // Cleanup
      await server.close();
    });

    it('should allow participants to reconnect after server restart', async () => {
      // Arrange - Create poll and participant before "restart"
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['REST03', 'Reconnect after restart?', JSON.stringify(['Yes', 'No']), 'open']
      );
      const pollId = pollResult.rows[0].id;

      await dbPool.query(
        `INSERT INTO participants (poll_id, nickname, is_connected)
         VALUES ($1, $2, $3)`,
        [pollId, 'Charlie', false]
      );

      // Act - Start server
      const app = require('../../src/server');
      const server = app.listen(0);
      const serverPort = server.address().port;

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Connect WebSocket client
      const clientSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Attempt to rejoin
      const rejoinPromise = new Promise((resolve) => {
        clientSocket.on('participant-rejoined', resolve);
      });

      clientSocket.emit('join-room', {
        roomCode: 'REST03',
        nickname: 'Charlie',
      });

      const rejoinData = await rejoinPromise;

      // Assert - Successfully rejoined
      expect(rejoinData).toHaveProperty('nickname', 'Charlie');
      expect(rejoinData).toHaveProperty('roomCode', 'REST03');

      // Verify database updated
      const participantResult = await dbPool.query(
        `SELECT is_connected, socket_id FROM participants
         WHERE poll_id = $1 AND nickname = $2`,
        [pollId, 'Charlie']
      );

      expect(participantResult.rows[0].is_connected).toBe(true);
      expect(participantResult.rows[0].socket_id).toBeDefined();

      // Cleanup
      clientSocket.disconnect();
      await server.close();
    });

    it('should maintain poll state through restart', async () => {
      // Arrange - Create closed poll
      await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)`,
        ['REST04', 'Closed poll?', JSON.stringify(['X', 'Y']), 'closed']
      );

      // Act - Start server
      const app = require('../../src/server');
      const server = app.listen(0);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - Poll state is 'closed'
      const response = await request(server)
        .get('/api/polls/REST04')
        .expect(200);

      expect(response.body.state).toBe('closed');

      // Cleanup
      await server.close();
    });
  });

  describe('Multiple Polls Restoration', () => {
    it('should restore multiple active polls after restart', async () => {
      // Arrange - Create multiple polls
      const polls = [
        { roomCode: 'MULTI1', question: 'Poll 1?', options: ['A', 'B'] },
        { roomCode: 'MULTI2', question: 'Poll 2?', options: ['X', 'Y', 'Z'] },
        { roomCode: 'MULTI3', question: 'Poll 3?', options: ['One', 'Two', 'Three', 'Four'] },
      ];

      for (const poll of polls) {
        await dbPool.query(
          `INSERT INTO polls (room_code, question, options, state)
           VALUES ($1, $2, $3, $4)`,
          [poll.roomCode, poll.question, JSON.stringify(poll.options), 'open']
        );
      }

      // Act - Start server
      const app = require('../../src/server');
      const server = app.listen(0);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - All polls retrievable
      for (const poll of polls) {
        const response = await request(server)
          .get(`/api/polls/${poll.roomCode}`)
          .expect(200);

        expect(response.body.question).toBe(poll.question);
        expect(response.body.options).toEqual(poll.options);
      }

      // Cleanup
      await server.close();
    });

    it('should not restore inactive (soft-deleted) polls', async () => {
      // Arrange - Create active and inactive polls
      await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        ['ACTIVE', 'Active poll?', JSON.stringify(['Yes', 'No']), 'open', true]
      );

      await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        ['INACTIVE', 'Inactive poll?', JSON.stringify(['Yes', 'No']), 'closed', false]
      );

      // Act - Start server
      const app = require('../../src/server');
      const server = app.listen(0);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - Active poll retrievable
      await request(server)
        .get('/api/polls/ACTIVE')
        .expect(200);

      // Assert - Inactive poll not retrievable
      await request(server)
        .get('/api/polls/INACTIVE')
        .expect(404);

      // Cleanup
      await server.close();
    });
  });

  describe('Zero Data Loss Guarantee', () => {
    it('should not lose any votes during restart', async () => {
      // Arrange - Create poll with comprehensive vote data
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['NOLOSS', 'Data loss test?', JSON.stringify(['Opt1', 'Opt2', 'Opt3']), 'open']
      );
      const pollId = pollResult.rows[0].id;

      // Add 10 participants
      const participantIds = [];
      for (let i = 1; i <= 10; i++) {
        const result = await dbPool.query(
          `INSERT INTO participants (poll_id, nickname)
           VALUES ($1, $2)
           RETURNING id`,
          [pollId, `User${i}`]
        );
        participantIds.push(result.rows[0].id);
      }

      // Add votes (random distribution)
      const voteCounts = { 0: 0, 1: 0, 2: 0 };
      for (let i = 0; i < 10; i++) {
        const optionIndex = i % 3; // Distribute evenly
        await dbPool.query(
          'INSERT INTO votes (participant_id, option_index) VALUES ($1, $2)',
          [participantIds[i], optionIndex]
        );
        voteCounts[optionIndex]++;
      }

      // Record vote counts before restart
      const voteCountsBeforeRestart = await dbPool.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index
         ORDER BY v.option_index`,
        [pollId]
      );

      // Act - Start server (simulating restart)
      const app = require('../../src/server');
      const server = app.listen(0);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert - All votes still present
      const voteCountsAfterRestart = await dbPool.query(
        `SELECT v.option_index, COUNT(*) as count
         FROM votes v
         JOIN participants p ON v.participant_id = p.id
         WHERE p.poll_id = $1
         GROUP BY v.option_index
         ORDER BY v.option_index`,
        [pollId]
      );

      expect(voteCountsAfterRestart.rows).toEqual(voteCountsBeforeRestart.rows);

      // Retrieve via API
      const response = await request(server)
        .get('/api/polls/NOLOSS')
        .expect(200);

      expect(response.body.participantCount).toBe(10);
      expect(response.body.votes['0']).toBe(voteCounts[0]);
      expect(response.body.votes['1']).toBe(voteCounts[1]);
      expect(response.body.votes['2']).toBe(voteCounts[2]);

      // Cleanup
      await server.close();
    });
  });
});
