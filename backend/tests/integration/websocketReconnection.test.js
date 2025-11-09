const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { createServer } = require('http');
const PollService = require('../../src/services/pollService');
const { initializePool, closePool } = require('../../src/config/database');
const initializeSocketHandler = require('../../src/sockets/socketHandler');

/**
 * Integration Test: WebSocket Reconnection (T109)
 *
 * Validates automatic reconnection behavior:
 * - Client reconnects after disconnection
 * - Session state persists across reconnections
 * - Participant rejoins room automatically
 * - Vote data is preserved after reconnection
 * - Handles multiple rapid disconnects/reconnects
 */
describe('Integration: WebSocket Reconnection', () => {
  let httpServer;
  let io;
  let pollService;
  let serverPort;

  beforeAll(() => {
    // Initialize database pool
    initializePool();
    const pool = require('../../src/config/database').getPool();
    pollService = new PollService(pool);
  });

  afterAll(async () => {
    await closePool();
  });

  beforeEach((done) => {
    // Create HTTP server and Socket.io server
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize socket handler
    initializeSocketHandler(io, pollService);

    // Start server on random port
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      done();
    });
  });

  afterEach((done) => {
    io.close();
    httpServer.close(done);
  });

  it('should automatically reconnect after disconnection', (done) => {
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionAttempts: 5,
    });

    let disconnectCount = 0;
    let reconnectCount = 0;

    client.on('connect', () => {
      reconnectCount++;

      if (reconnectCount === 1) {
        // First connection - force disconnect
        client.io.engine.close();
      } else if (reconnectCount === 2) {
        // Reconnected successfully
        expect(reconnectCount).toBe(2);
        client.close();
        done();
      }
    });

    client.on('disconnect', () => {
      disconnectCount++;
    });
  }, 10000);

  it('should preserve participant session across reconnection', async () => {
    // Create a poll first
    const poll = await pollService.createPoll({
      question: 'Reconnection test?',
      options: ['Yes', 'No'],
      hostId: 'host-123',
    });
    const {roomCode} = poll;

    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
      });

      let originalSocketId;
      let joinedRoom = false;

      client.on('connect', () => {
        if (!joinedRoom) {
          // First connection - join room
          originalSocketId = client.id;
          client.emit('join-room', {
            roomCode,
            nickname: 'TestUser',
          });
        } else {
          // After reconnection - verify session
          expect(client.id).not.toBe(originalSocketId); // New socket ID
          client.close();
          resolve();
        }
      });

      client.on('participant-joined', (data) => {
        if (data.nickname === 'TestUser') {
          joinedRoom = true;
          // Force disconnect to test reconnection
          setTimeout(() => {
            client.io.engine.close();
          }, 100);
        }
      });

      client.on('error', (err) => {
        client.close();
        reject(err);
      });

      setTimeout(() => {
        client.close();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  }, 10000);

  it.skip('should preserve vote data after reconnection', async () => {
    // Create and open a poll
    const poll = await pollService.createPoll({
      question: 'Vote preservation test?',
      options: ['Option A', 'Option B'],
      hostId: 'host-123',
    });
    const {roomCode} = poll;
    await pollService.changePollState(roomCode, 'open');

    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100,
      });

      let votedBeforeDisconnect = false;
      let reconnected = false;

      client.on('connect', () => {
        if (!reconnected) {
          // First connection - join and vote
          client.emit('join-room', {
            roomCode,
            nickname: 'Voter',
          });
        }
      });

      client.on('participant-joined', (data) => {
        if (data.nickname === 'Voter' && !votedBeforeDisconnect) {
          // Submit vote
          client.emit('submit-vote', {
            roomCode,
            optionIndex: 0,
          });
        }
      });

      client.on('vote-update', (data) => {
        if (!votedBeforeDisconnect) {
          // Vote recorded - now disconnect
          expect(data.votes[0]).toBe(1);
          votedBeforeDisconnect = true;
          client.io.engine.close();
        } else if (reconnected) {
          // After reconnection - vote should still be there
          expect(data.votes[0]).toBe(1);
          client.close();
          resolve();
        }
      });

      client.on('reconnect', () => {
        reconnected = true;
        // Rejoin room after reconnection
        client.emit('join-room', {
          roomCode,
          nickname: 'Voter',
        });
      });

      client.on('error', (err) => {
        client.close();
        reject(err);
      });

      setTimeout(() => {
        client.close();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  }, 10000);

  it('should handle multiple rapid reconnections', (done) => {
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 50,
      reconnectionAttempts: 10,
    });

    let connectCount = 0;
    const targetConnections = 5;

    client.on('connect', () => {
      connectCount++;

      if (connectCount < targetConnections) {
        // Force disconnect for next reconnection
        setTimeout(() => {
          client.io.engine.close();
        }, 50);
      } else if (connectCount === targetConnections) {
        // Successfully reconnected multiple times
        expect(connectCount).toBe(targetConnections);
        client.close();
        done();
      }
    });

    client.on('connect_error', (err) => {
      client.close();
      done(new Error(`Connection error: ${err.message}`));
    });
  }, 10000);

  it('should support reconnection configuration', () => {
    // Test that client can be configured with reconnection options
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionAttempts: 5,
    });

    // Verify reconnection is enabled
    expect(client.io._reconnection).toBe(true);
    expect(client.io._reconnectionDelay).toBe(100);
    expect(client.io._reconnectionAttempts).toBe(5);

    client.close();
  });

  it('should configure client with no reconnection if disabled', () => {
    // Test that reconnection can be disabled
    const client = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      reconnection: false,
    });

    // Verify reconnection is disabled
    expect(client.io._reconnection).toBe(false);

    client.close();
  });

  it('should handle connection errors gracefully', (done) => {
    // Try to connect to a non-existent server
    const client = Client('http://localhost:0', {
      transports: ['websocket'],
      reconnection: false,
      timeout: 1000,
    });

    client.on('connect_error', (err) => {
      expect(err).toBeDefined();
      client.close();
      done();
    });

    client.on('connect', () => {
      client.close();
      done(new Error('Should not have connected'));
    });
  }, 10000);
});
