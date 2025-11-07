const { io: ioClient } = require('socket.io-client');
const { httpServer, pollManager } = require('../../src/server.js');
const config = require('../../src/config/index.js');
const { CHANGE_POLL_STATE, POLL_STATE_CHANGED } = require('../../../shared/eventTypes.js');

describe('WebSocket Contract Tests', () => {
  let clientSocket;
  let serverUrl;

  beforeAll(done => {
    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll(done => {
    httpServer.close(done);
  });

  beforeEach(done => {
    clientSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('change-poll-state event', () => {
    let hostSocket;
    let poll;

    beforeEach(done => {
      // Create a poll with host socket
      hostSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      hostSocket.on('connect', () => {
        poll = pollManager.createPoll(
          'Test question?',
          ['Option A', 'Option B'],
          hostSocket.id
        );
        done();
      });
    });

    afterEach(() => {
      if (hostSocket.connected) {
        hostSocket.disconnect();
      }
    });

    it('should allow host to change poll state from waiting to open', done => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: poll.roomCode, newState: 'open' },
        response => {
          expect(response.success).toBe(true);
          expect(response.poll.state).toBe('open');
          expect(response.previousState).toBe('waiting');
          done();
        }
      );
    });

    it('should allow host to change poll state from open to closed', done => {
      pollManager.changePollState(poll.roomCode, 'open', hostSocket.id);

      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: poll.roomCode, newState: 'closed' },
        response => {
          expect(response.success).toBe(true);
          expect(response.poll.state).toBe('closed');
          expect(response.previousState).toBe('open');
          done();
        }
      );
    });

    it('should reject state change from non-host socket', done => {
      const nonHostSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      nonHostSocket.on('connect', () => {
        nonHostSocket.emit(
          CHANGE_POLL_STATE,
          { roomCode: poll.roomCode, newState: 'open' },
          response => {
            expect(response.success).toBe(false);
            expect(response.error).toContain('Only the host can change poll state');

            // Verify state didn't change
            const currentPoll = pollManager.getPoll(poll.roomCode);
            expect(currentPoll.state).toBe('waiting');

            nonHostSocket.disconnect();
            done();
          }
        );
      });
    });

    it('should reject state change for non-existent room code', done => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: 'FAKE99', newState: 'open' },
        response => {
          expect(response.success).toBe(false);
          expect(response.error).toContain('Poll not found');
          done();
        }
      );
    });

    it('should reject invalid state transitions', done => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: poll.roomCode, newState: 'invalid-state' },
        response => {
          expect(response.success).toBe(false);
          expect(response.error).toContain('Invalid state');
          done();
        }
      );
    });

    it('should broadcast poll-state-changed event to all clients in room', done => {
      const participantSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      participantSocket.on('connect', () => {
        // Both sockets join the room
        participantSocket.emit('join-room', {
          roomCode: poll.roomCode,
          nickname: 'Participant1',
        });

        // Listen for broadcast
        participantSocket.on(POLL_STATE_CHANGED, data => {
          expect(data.roomCode).toBe(poll.roomCode);
          expect(data.newState).toBe('open');
          expect(data.previousState).toBe('waiting');

          participantSocket.disconnect();
          done();
        });

        // Host changes state
        setTimeout(() => {
          hostSocket.emit(CHANGE_POLL_STATE, {
            roomCode: poll.roomCode,
            newState: 'open',
          });
        }, 100);
      });
    });

    it('should validate required fields (roomCode and newState)', done => {
      hostSocket.emit(CHANGE_POLL_STATE, { roomCode: poll.roomCode }, response => {
        expect(response.success).toBe(false);
        expect(response.error).toContain('newState');
        done();
      });
    });
  });
});
