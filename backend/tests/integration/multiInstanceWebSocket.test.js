const io = require('socket.io-client');
const http = require('http');
const { app, initializeInfrastructure } = require('../../src/server');

/**
 * Integration Test: Multi-Instance WebSocket Consistency (T095)
 *
 * Validates that multiple backend instances can communicate via Redis adapter:
 * - Participants connected to different instances see the same real-time updates
 * - Vote updates broadcast across all instances
 * - Poll state changes propagate across instances
 * - Participant join/leave events sync across instances
 *
 * This ensures horizontal scalability with consistent real-time behavior.
 */
describe('Integration: Multi-Instance WebSocket Consistency', () => {
  let server1;
  let server2;
  let httpServer1;
  let httpServer2;
  let client1;
  let client2;
  let pollRoomCode;

  beforeAll(async () => {
    // Initialize infrastructure (database, Redis)
    await initializeInfrastructure();
  });

  beforeEach(async () => {
    // Create two server instances on different ports
    httpServer1 = http.createServer(app);
    httpServer2 = http.createServer(app);

    await new Promise((resolve) => {
      httpServer1.listen(4001, resolve);
    });
    await new Promise((resolve) => {
      httpServer2.listen(4002, resolve);
    });

    // Create poll for testing
    const request = require('supertest');
    const response = await request(app)
      .post('/api/polls')
      .send({
        question: 'Multi-instance test poll?',
        options: ['Option A', 'Option B', 'Option C'],
      });

    pollRoomCode = response.body.roomCode;
  });

  afterEach(async () => {
    // Disconnect clients
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();

    // Close servers
    await new Promise((resolve) => {
      if (httpServer1) httpServer1.close(resolve);
      else resolve();
    });
    await new Promise((resolve) => {
      if (httpServer2) httpServer2.close(resolve);
      else resolve();
    });
  });

  describe('Cross-Instance Vote Broadcasting', () => {
    it('should broadcast vote updates from instance 1 to instance 2', (done) => {
      // Connect client 1 to instance 1 (port 4001)
      client1 = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      // Connect client 2 to instance 2 (port 4002)
      client2 = io('http://localhost:4002', {
        transports: ['websocket'],
        forceNew: true,
      });

      let client1Joined = false;
      let client2Joined = false;

      // Client 1 joins poll on instance 1
      client1.on('connect', () => {
        client1.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Participant1',
        });
      });

      client1.on('participant-joined', (data) => {
        if (data.nickname === 'Participant1') {
          client1Joined = true;
          checkBothJoined();
        }
      });

      // Client 2 joins poll on instance 2
      client2.on('connect', () => {
        client2.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Participant2',
        });
      });

      client2.on('participant-joined', (data) => {
        if (data.nickname === 'Participant2') {
          client2Joined = true;
          checkBothJoined();
        }
      });

      function checkBothJoined() {
        if (client1Joined && client2Joined) {
          // Client 1 submits vote on instance 1
          client1.emit('submit-vote', {
            roomCode: pollRoomCode,
            optionIndex: 0,
          });
        }
      }

      // Client 2 (on instance 2) should receive vote update from client 1 (on instance 1)
      client2.on('vote-update', (data) => {
        expect(data).toHaveProperty('votes');
        expect(data.votes[0]).toBeGreaterThan(0); // Vote from client 1 should be reflected
        done();
      });
    }, 10000);

    it('should sync participant counts across instances', (done) => {
      client1 = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      client2 = io('http://localhost:4002', {
        transports: ['websocket'],
        forceNew: true,
      });

      let joinCount = 0;

      client1.on('connect', () => {
        client1.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Participant1',
        });
      });

      client2.on('connect', () => {
        client2.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Participant2',
        });
      });

      // Both clients should see both participant joins
      const handleJoin = (data) => {
        joinCount++;
        expect(data).toHaveProperty('nickname');
        expect(data).toHaveProperty('count');

        // After both joins, count should be 2
        if (joinCount >= 2) {
          expect(data.count).toBeGreaterThanOrEqual(2);
          done();
        }
      };

      client1.on('participant-joined', handleJoin);
      client2.on('participant-joined', handleJoin);
    }, 10000);
  });

  describe('Cross-Instance Poll State Changes', () => {
    it('should broadcast poll state changes across instances', (done) => {
      client1 = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      client2 = io('http://localhost:4002', {
        transports: ['websocket'],
        forceNew: true,
      });

      client1.on('connect', () => {
        client1.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Host',
        });
      });

      client2.on('connect', () => {
        client2.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Participant',
        });
      });

      let participantReady = false;

      client2.on('participant-joined', (data) => {
        if (data.nickname === 'Participant') {
          participantReady = true;
        }
      });

      // Wait for participant to join, then host changes state
      setTimeout(() => {
        if (participantReady) {
          // Host (on instance 1) closes the poll
          client1.emit('change-poll-state', {
            roomCode: pollRoomCode,
            newState: 'closed',
          });
        }
      }, 1000);

      // Participant (on instance 2) should receive state change from host (on instance 1)
      client2.on('poll-state-changed', (data) => {
        expect(data.newState).toBe('closed');
        expect(data.previousState).toBe('open');
        done();
      });
    }, 10000);
  });

  describe('Session State Persistence', () => {
    it('should maintain session state when participant reconnects to different instance', async () => {
      // This test verifies session data is stored in Redis, not in-memory
      client1 = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client1.on('connect', () => {
          client1.emit('join-room', {
            roomCode: pollRoomCode,
            nickname: 'PersistentParticipant',
          });
          resolve();
        });
      });

      // Wait for join to complete
      await new Promise((resolve) => {
        client1.on('participant-joined', resolve);
      });

      // Disconnect from instance 1
      client1.disconnect();

      // Reconnect to instance 2 (simulates load balancer routing to different instance)
      client2 = io('http://localhost:4002', {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client2.on('connect', () => {
          // Rejoin with same nickname
          client2.emit('join-room', {
            roomCode: pollRoomCode,
            nickname: 'PersistentParticipant',
          });
          resolve();
        });
      });

      // Should successfully rejoin (session data available in Redis)
      const joinData = await new Promise((resolve) => {
        client2.on('participant-joined', resolve);
      });

      expect(joinData.nickname).toBe('PersistentParticipant');
    }, 10000);
  });

  describe('Performance Under Load', () => {
    it('should handle multiple participants across instances with low latency', async () => {
      const numClients = 10;
      const clients = [];

      // Connect 5 clients to instance 1, 5 to instance 2
      for (let i = 0; i < numClients; i++) {
        const port = i < 5 ? 4001 : 4002;
        const client = io(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        clients.push(client);

        await new Promise((resolve) => {
          client.on('connect', () => {
            client.emit('join-room', {
              roomCode: pollRoomCode,
              nickname: `Participant${i}`,
            });
            resolve();
          });
        });
      }

      // Wait for all joins to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Measure broadcast latency
      const start = Date.now();

      // First client submits vote
      clients[0].emit('submit-vote', {
        roomCode: pollRoomCode,
        optionIndex: 0,
      });

      // Last client (on different instance) receives update
      await new Promise((resolve) => {
        clients[numClients - 1].on('vote-update', resolve);
      });

      const latency = Date.now() - start;

      // Cross-instance broadcast should complete within 2 seconds
      expect(latency).toBeLessThan(2000);

      // Cleanup
      clients.forEach((client) => client.disconnect());
    }, 15000);
  });
});
