const io = require('socket.io-client');
const { Pool } = require('pg');
const { httpServer, initializeInfrastructure } = require('../../src/server');
const { closePool } = require('../../src/config/database');
const { closeRedis } = require('../../src/config/cache');

describe('Integration: Participant Reconnection', () => {
  let dbPool;
  let serverPort;
  let clientSocket1;
  let clientSocket2;

  beforeAll(async () => {
    // Initialize infrastructure (database, Redis, routes, socket handlers)
    await initializeInfrastructure();

    // Initialize database connection for test verification (use dev database)
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'zephyr_dev',
      user: process.env.DB_USER || 'zephyr',
      password: process.env.DB_PASSWORD || 'zephyr_dev_password',
    });

    // Start server
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
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
    // Clean database
    await dbPool.query('TRUNCATE TABLE votes, participants, polls RESTART IDENTITY CASCADE');
  });

  afterEach(() => {
    // Disconnect all clients
    if (clientSocket1 && clientSocket1.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2 && clientSocket2.connected) {
      clientSocket2.disconnect();
    }
  });

  describe('Participant Disconnect and Reconnect Flow', () => {
    it('should update socket_id when participant reconnects with same nickname', async () => {
      // Arrange - Create poll
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['RECON1', 'Reconnection test?', JSON.stringify(['Yes', 'No']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Act - First connection (join room)
      clientSocket1 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket1.on('connect', resolve);
      });

      const joinPromise = new Promise((resolve) => {
        clientSocket1.on('participant-joined', resolve);
      });

      clientSocket1.emit('join-room', {
        roomCode,
        nickname: 'Alice',
      });

      await joinPromise;

      // Get initial socket ID from database
      const initialResult = await dbPool.query(
        `SELECT id, socket_id, is_connected FROM participants
         WHERE poll_id = $1 AND nickname = $2`,
        [pollId, 'Alice']
      );

      expect(initialResult.rows).toHaveLength(1);
      const initialSocketId = initialResult.rows[0].socket_id;
      const participantId = initialResult.rows[0].id;
      expect(initialResult.rows[0].is_connected).toBe(true);

      // Act - Disconnect
      clientSocket1.disconnect();

      // Wait for disconnect to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Participant marked as disconnected
      const afterDisconnect = await dbPool.query(
        'SELECT is_connected FROM participants WHERE id = $1',
        [participantId]
      );
      expect(afterDisconnect.rows[0].is_connected).toBe(false);

      // Act - Reconnect with same nickname (new socket connection)
      clientSocket2 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket2.on('connect', resolve);
      });

      const rejoinPromise = new Promise((resolve) => {
        clientSocket2.on('participant-rejoined', resolve);
      });

      clientSocket2.emit('join-room', {
        roomCode,
        nickname: 'Alice',
      });

      await rejoinPromise;

      // Assert - Socket ID updated, still same participant record
      const afterReconnect = await dbPool.query(
        'SELECT id, socket_id, is_connected FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, 'Alice']
      );

      expect(afterReconnect.rows).toHaveLength(1);
      expect(afterReconnect.rows[0].id).toBe(participantId); // Same participant
      expect(afterReconnect.rows[0].socket_id).not.toBe(initialSocketId); // New socket ID
      expect(afterReconnect.rows[0].is_connected).toBe(true);
    });

    it('should preserve vote data after participant reconnects', async () => {
      // Arrange - Create poll and participant
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['RECON2', 'Vote preservation test?', JSON.stringify(['A', 'B', 'C']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Connect and join
      clientSocket1 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket1.on('connect', resolve);
      });

      const joinPromise = new Promise((resolve) => {
        clientSocket1.on('participant-joined', resolve);
      });

      clientSocket1.emit('join-room', {
        roomCode,
        nickname: 'Bob',
      });

      await joinPromise;

      // Get participant ID
      const participantResult = await dbPool.query(
        'SELECT id FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, 'Bob']
      );
      const participantId = participantResult.rows[0].id;

      // Submit vote
      const votePromise = new Promise((resolve) => {
        clientSocket1.on('vote-update', resolve);
      });

      clientSocket1.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 1,
      });

      await votePromise;

      // Verify vote persisted
      const voteBeforeDisconnect = await dbPool.query(
        'SELECT option_index FROM votes WHERE participant_id = $1',
        [participantId]
      );
      expect(voteBeforeDisconnect.rows[0].option_index).toBe(1);

      // Act - Disconnect and reconnect
      clientSocket1.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      clientSocket2 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket2.on('connect', resolve);
      });

      const rejoinPromise = new Promise((resolve) => {
        clientSocket2.on('participant-rejoined', resolve);
      });

      clientSocket2.emit('join-room', {
        roomCode,
        nickname: 'Bob',
      });

      const rejoinData = await rejoinPromise;

      // Assert - Vote still preserved
      const voteAfterReconnect = await dbPool.query(
        'SELECT option_index FROM votes WHERE participant_id = $1',
        [participantId]
      );
      expect(voteAfterReconnect.rows[0].option_index).toBe(1);

      // Assert - Rejoined participant receives their previous vote in response
      expect(rejoinData).toHaveProperty('previousVote', 1);
    });

    it('should update last_seen_at timestamp on reconnection', async () => {
      // Arrange - Create poll
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['RECON3', 'Timestamp test?', JSON.stringify(['X', 'Y']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Initial connection
      clientSocket1 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket1.on('connect', resolve);
      });

      const joinPromise = new Promise((resolve) => {
        clientSocket1.on('participant-joined', resolve);
      });

      clientSocket1.emit('join-room', {
        roomCode,
        nickname: 'Charlie',
      });

      await joinPromise;

      // Get initial timestamp
      const initialResult = await dbPool.query(
        'SELECT last_seen_at FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, 'Charlie']
      );
      const initialTimestamp = new Date(initialResult.rows[0].last_seen_at);

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Disconnect
      clientSocket1.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reconnect
      clientSocket2 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket2.on('connect', resolve);
      });

      const rejoinPromise = new Promise((resolve) => {
        clientSocket2.on('participant-rejoined', resolve);
      });

      clientSocket2.emit('join-room', {
        roomCode,
        nickname: 'Charlie',
      });

      await rejoinPromise;

      // Assert - last_seen_at updated
      const afterReconnect = await dbPool.query(
        'SELECT last_seen_at FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, 'Charlie']
      );
      const newTimestamp = new Date(afterReconnect.rows[0].last_seen_at);

      expect(newTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should allow participant to continue voting after reconnection', async () => {
      // Arrange - Create poll and join
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['RECON4', 'Continue voting?', JSON.stringify(['One', 'Two']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      clientSocket1 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket1.on('connect', resolve);
      });

      const joinPromise = new Promise((resolve) => {
        clientSocket1.on('participant-joined', resolve);
      });

      clientSocket1.emit('join-room', {
        roomCode,
        nickname: 'Diana',
      });

      await joinPromise;

      const participantResult = await dbPool.query(
        'SELECT id FROM participants WHERE poll_id = $1 AND nickname = $2',
        [pollId, 'Diana']
      );
      const participantId = participantResult.rows[0].id;

      // Vote before disconnect
      const vote1Promise = new Promise((resolve) => {
        clientSocket1.on('vote-update', resolve);
      });

      clientSocket1.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 0,
      });

      await vote1Promise;

      // Disconnect and reconnect
      clientSocket1.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));

      clientSocket2 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        clientSocket2.on('connect', resolve);
      });

      const rejoinPromise = new Promise((resolve) => {
        clientSocket2.on('participant-rejoined', resolve);
      });

      clientSocket2.emit('join-room', {
        roomCode,
        nickname: 'Diana',
      });

      await rejoinPromise;

      // Act - Vote again after reconnection (change vote)
      const vote2Promise = new Promise((resolve) => {
        clientSocket2.on('vote-update', resolve);
      });

      clientSocket2.emit('submit-vote', {
        roomCode,
        participantId,
        optionIndex: 1,
      });

      await vote2Promise;

      // Assert - Vote changed successfully
      const finalVote = await dbPool.query(
        'SELECT option_index FROM votes WHERE participant_id = $1',
        [participantId]
      );
      expect(finalVote.rows[0].option_index).toBe(1);
    });
  });

  describe('Multiple Participants Reconnection', () => {
    it('should handle multiple participants reconnecting independently', async () => {
      // Arrange - Create poll
      const pollResult = await dbPool.query(
        `INSERT INTO polls (room_code, question, options, state)
         VALUES ($1, $2, $3, $4)
         RETURNING id, room_code`,
        ['MULTI1', 'Multi reconnect?', JSON.stringify(['Yes', 'No']), 'open']
      );
      const pollId = pollResult.rows[0].id;
      const roomCode = pollResult.rows[0].room_code;

      // Create multiple participants directly in database
      await dbPool.query(
        'INSERT INTO participants (poll_id, nickname, is_connected) VALUES ($1, $2, false)',
        [pollId, 'User1']
      );
      await dbPool.query(
        'INSERT INTO participants (poll_id, nickname, is_connected) VALUES ($1, $2, false)',
        [pollId, 'User2']
      );
      await dbPool.query(
        'INSERT INTO participants (poll_id, nickname, is_connected) VALUES ($1, $2, false)',
        [pollId, 'User3']
      );

      // Act - User1 reconnects
      const socket1 = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      await new Promise((resolve) => {
        socket1.on('connect', resolve);
      });

      const join1 = new Promise((resolve) => {
        socket1.on('participant-rejoined', resolve);
      });

      socket1.emit('join-room', {
        roomCode,
        nickname: 'User1',
      });

      await join1;

      // Assert - Only User1 reconnected
      const connectionStatus = await dbPool.query(
        `SELECT nickname, is_connected
         FROM participants
         WHERE poll_id = $1
         ORDER BY nickname`,
        [pollId]
      );

      expect(connectionStatus.rows).toHaveLength(3);
      expect(connectionStatus.rows[0]).toMatchObject({ nickname: 'User1', is_connected: true });
      expect(connectionStatus.rows[1]).toMatchObject({ nickname: 'User2', is_connected: false });
      expect(connectionStatus.rows[2]).toMatchObject({ nickname: 'User3', is_connected: false });

      // Cleanup
      socket1.disconnect();
    });
  });
});
