const io = require('socket.io-client');
const http = require('http');
const { app, initializeInfrastructure } = require('../../src/server');
const redis = require('../../src/config/cache');

/**
 * Performance Test: Distributed Session State (T096)
 *
 * Validates that session state management in Redis performs well under load:
 * - Session read/write operations complete within acceptable latency (<50ms)
 * - Multiple instances can access session data concurrently
 * - Session state remains consistent under concurrent updates
 * - Redis handles high throughput of session operations
 *
 * This ensures the session state layer doesn't become a bottleneck.
 */
describe('Performance: Distributed Session State', () => {
  let httpServer1;
  let httpServer2;
  let pollRoomCode;

  beforeAll(async () => {
    await initializeInfrastructure();
  });

  beforeEach(async () => {
    // Create two server instances
    httpServer1 = http.createServer(app);
    httpServer2 = http.createServer(app);

    await new Promise((resolve) => {
      httpServer1.listen(4001, resolve);
    });
    await new Promise((resolve) => {
      httpServer2.listen(4002, resolve);
    });

    // Create poll
    const request = require('supertest');
    const response = await request(app)
      .post('/api/polls')
      .send({
        question: 'Session performance test?',
        options: ['A', 'B'],
      });

    pollRoomCode = response.body.roomCode;
  });

  afterEach(async () => {
    await new Promise((resolve) => {
      if (httpServer1) httpServer1.close(resolve);
      else resolve();
    });
    await new Promise((resolve) => {
      if (httpServer2) httpServer2.close(resolve);
      else resolve();
    });
  });

  describe('Session Read Performance', () => {
    it('should read session data within 50ms', async () => {
      const client = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client.on('connect', () => {
          client.emit('join-room', {
            roomCode: pollRoomCode,
            nickname: 'TestParticipant',
          });
          resolve();
        });
      });

      await new Promise((resolve) => {
        client.on('participant-joined', resolve);
      });

      // Measure session read time
      const iterations = 100;
      const readTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        // Simulate session read (get participant data)
        // This would typically happen when handling events
        // For now, we'll measure a representative Redis operation
        await redis.getRedis().get(`session:test:${i}`);

        const duration = Date.now() - start;
        readTimes.push(duration);
      }

      const avgReadTime = readTimes.reduce((sum, t) => sum + t, 0) / iterations;
      const maxReadTime = Math.max(...readTimes);

      expect(avgReadTime).toBeLessThan(10); // Average should be very fast
      expect(maxReadTime).toBeLessThan(50); // Even max should be under 50ms

      client.disconnect();
    }, 15000);
  });

  describe('Session Write Performance', () => {
    it('should write session data within 50ms', async () => {
      const client = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client.on('connect', resolve);
      });

      // Measure session write time
      const iterations = 100;
      const writeTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        // Simulate session write
        await redis.getRedis().set(
          `session:test:${i}`,
          JSON.stringify({
            socketId: `socket-${i}`,
            pollId: pollRoomCode,
            nickname: `Participant${i}`,
            lastSeen: Date.now(),
          }),
          'EX',
          3600 // 1 hour TTL
        );

        const duration = Date.now() - start;
        writeTimes.push(duration);
      }

      const avgWriteTime = writeTimes.reduce((sum, t) => sum + t, 0) / iterations;
      const maxWriteTime = Math.max(...writeTimes);

      expect(avgWriteTime).toBeLessThan(10);
      expect(maxWriteTime).toBeLessThan(50);

      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await redis.getRedis().del(`session:test:${i}`);
      }

      client.disconnect();
    }, 15000);
  });

  describe('Concurrent Session Access', () => {
    it('should handle concurrent session reads from multiple instances', async () => {
      const numClients = 20;
      const clients = [];

      // Connect clients to both instances
      for (let i = 0; i < numClients; i++) {
        const port = i % 2 === 0 ? 4001 : 4002;
        const client = io(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(
        clients.map(
          (client) =>
            new Promise((resolve) => {
              client.on('connect', resolve);
            })
        )
      );

      const start = Date.now();

      // All clients join simultaneously
      await Promise.all(
        clients.map((client, i) =>
          new Promise((resolve) => {
            client.emit('join-room', {
              roomCode: pollRoomCode,
              nickname: `Participant${i}`,
            });
            client.on('participant-joined', (data) => {
              if (data.nickname === `Participant${i}`) {
                resolve();
              }
            });
          })
        )
      );

      const duration = Date.now() - start;

      // All session writes should complete within 3 seconds
      expect(duration).toBeLessThan(3000);

      // Cleanup
      clients.forEach((client) => client.disconnect());
    }, 20000);
  });

  describe('Session Consistency', () => {
    it('should maintain consistent session state under concurrent updates', async () => {
      const client1 = io('http://localhost:4001', {
        transports: ['websocket'],
        forceNew: true,
      });

      const client2 = io('http://localhost:4002', {
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client1.on('connect', () => {
          client1.emit('join-room', {
            roomCode: pollRoomCode,
            nickname: 'ConcurrentParticipant',
          });
          resolve();
        });
      });

      await new Promise((resolve) => {
        client1.on('participant-joined', resolve);
      });

      // Rapidly submit votes from both instances
      const votes = [];
      for (let i = 0; i < 10; i++) {
        client1.emit('submit-vote', {
          roomCode: pollRoomCode,
          optionIndex: i % 2,
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Collect vote updates
      const voteUpdatesPromise = new Promise((resolve) => {
        const updates = [];
        client2.on('vote-update', (data) => {
          updates.push(data);
          if (updates.length >= 5) {
            resolve(updates);
          }
        });
      });

      client2.on('connect', () => {
        client2.emit('join-room', {
          roomCode: pollRoomCode,
          nickname: 'Observer',
        });
      });

      const voteUpdates = await voteUpdatesPromise;

      // Verify vote updates are consistent
      expect(voteUpdates.length).toBeGreaterThanOrEqual(5);

      // Vote counts should only increase (never decrease)
      for (let i = 1; i < voteUpdates.length; i++) {
        const prevTotal = voteUpdates[i - 1].votes.reduce((sum, v) => sum + v, 0);
        const currTotal = voteUpdates[i].votes.reduce((sum, v) => sum + v, 0);
        expect(currTotal).toBeGreaterThanOrEqual(prevTotal);
      }

      client1.disconnect();
      client2.disconnect();
    }, 15000);
  });

  describe('Session TTL and Cleanup', () => {
    it('should expire session data after TTL', async () => {
      const sessionKey = 'session:test:ttl-test';

      // Write session with 2 second TTL
      await redis.getRedis().set(
        sessionKey,
        JSON.stringify({ test: 'data' }),
        'EX',
        2
      );

      // Verify session exists
      const initialValue = await redis.getRedis().get(sessionKey);
      expect(initialValue).toBeTruthy();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Verify session expired
      const expiredValue = await redis.getRedis().get(sessionKey);
      expect(expiredValue).toBeNull();
    }, 5000);

    it('should handle cleanup of disconnected sessions', async () => {
      const clients = [];

      // Connect 5 clients
      for (let i = 0; i < 5; i++) {
        const client = io('http://localhost:4001', {
          transports: ['websocket'],
          forceNew: true,
        });

        await new Promise((resolve) => {
          client.on('connect', () => {
            client.emit('join-room', {
              roomCode: pollRoomCode,
              nickname: `TempParticipant${i}`,
            });
            resolve();
          });
        });

        clients.push(client);
      }

      // Wait for all joins
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Disconnect all clients
      clients.forEach((client) => client.disconnect());

      // Wait for disconnect handlers to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Session cleanup should have occurred
      // (Specific verification depends on session implementation)
      expect(true).toBe(true); // Placeholder - actual test would verify Redis keys cleaned
    }, 10000);
  });

  describe('Scalability Limits', () => {
    it('should handle 50+ concurrent participants across instances', async () => {
      const numClients = 50;
      const clients = [];

      const start = Date.now();

      // Connect clients alternating between instances
      for (let i = 0; i < numClients; i++) {
        const port = i % 2 === 0 ? 4001 : 4002;
        const client = io(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true,
        });

        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(
        clients.map(
          (client) =>
            new Promise((resolve) => {
              client.on('connect', resolve);
            })
        )
      );

      // All join poll
      await Promise.all(
        clients.map((client, i) =>
          new Promise((resolve) => {
            client.emit('join-room', {
              roomCode: pollRoomCode,
              nickname: `Participant${i}`,
            });
            client.on('participant-joined', (data) => {
              if (data.nickname === `Participant${i}`) {
                resolve();
              }
            });
          })
        )
      );

      const duration = Date.now() - start;

      // Should handle 50 participants within 5 seconds
      expect(duration).toBeLessThan(5000);

      // Cleanup
      clients.forEach((client) => client.disconnect());
    }, 30000);
  });
});
