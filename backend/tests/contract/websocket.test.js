const { io: ioClient } = require('socket.io-client');
const { httpServer, pollManager } = require('../../src/server.js');
const config = require('../../src/config/index.js');
const {
  CHANGE_POLL_STATE,
  POLL_STATE_CHANGED,
  JOIN_ROOM,
  SUBMIT_VOTE,
  VOTE_UPDATE,
  PARTICIPANT_JOINED,
  PARTICIPANT_LEFT,
} = require('../../../shared/eventTypes.js');

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
        poll = pollManager.createPoll('Test question?', ['Option A', 'Option B'], hostSocket.id);
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
      hostSocket.emit(CHANGE_POLL_STATE, { roomCode: 'FAKE99', newState: 'open' }, response => {
        expect(response.success).toBe(false);
        expect(response.error).toContain('Poll not found');
        done();
      });
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

  describe('join-room event', () => {
    let poll;
    let hostSocket;

    beforeEach(done => {
      hostSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      hostSocket.on('connect', () => {
        poll = pollManager.createPoll('Test question?', ['A', 'B', 'C'], hostSocket.id);
        done();
      });
    });

    afterEach(() => {
      if (hostSocket.connected) {
        hostSocket.disconnect();
      }
    });

    it('should allow participant to join with valid room code and nickname', done => {
      clientSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, response => {
        expect(response.success).toBe(true);
        expect(response.poll).toBeDefined();
        expect(response.poll.roomCode).toBe(poll.roomCode);
        expect(response.poll.question).toBe('Test question?');

        // Verify participant was added
        const currentPoll = pollManager.getPoll(poll.roomCode);
        expect(currentPoll.participants.has('Alice')).toBe(true);
        done();
      });
    });

    it('should reject join when room code is invalid', done => {
      clientSocket.emit(JOIN_ROOM, { roomCode: 'FAKE99', nickname: 'Alice' }, response => {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Poll not found');
        done();
      });
    });

    it('should reject join when nickname is already taken', done => {
      // First participant joins
      const participant1 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      participant1.on('connect', () => {
        participant1.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, response1 => {
          expect(response1.success).toBe(true);

          // Second participant tries same nickname
          clientSocket.emit(
            JOIN_ROOM,
            { roomCode: poll.roomCode, nickname: 'Alice' },
            response2 => {
              expect(response2.success).toBe(false);
              expect(response2.error).toBe('Nickname already taken');
              participant1.disconnect();
              done();
            }
          );
        });
      });
    });

    it('should reject join when room is full (20 participants)', done => {
      // Add 20 participants
      const sockets = [];
      let joinedCount = 0;

      const connectAndJoin = index => {
        const socket = ioClient(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });

        socket.on('connect', () => {
          socket.emit(
            JOIN_ROOM,
            { roomCode: poll.roomCode, nickname: `User${index}` },
            response => {
              if (index < 20) {
                expect(response.success).toBe(true);
              } else {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Room is full (20 participants max)');

                // Cleanup all sockets
                sockets.forEach(s => s.disconnect());
                socket.disconnect();
                done();
              }

              joinedCount += 1;
              if (joinedCount === 21) {
                // This ensures we've tested the 21st participant
                return;
              }
            }
          );
        });

        sockets.push(socket);
      };

      // Try to connect 21 participants
      for (let i = 0; i < 21; i += 1) {
        connectAndJoin(i);
      }
    }, 10000); // Increase timeout for this test

    it('should broadcast participant-joined event to all clients in room', done => {
      const participant1 = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      participant1.on('connect', () => {
        // First participant joins
        participant1.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' });

        // Listen for broadcast when second participant joins
        participant1.on(PARTICIPANT_JOINED, data => {
          expect(data.nickname).toBe('Bob');
          expect(data.count).toBeGreaterThan(0);
          participant1.disconnect();
          done();
        });

        // Second participant joins after a short delay
        setTimeout(() => {
          clientSocket.emit(JOIN_ROOM, {
            roomCode: poll.roomCode,
            nickname: 'Bob',
          });
        }, 100);
      });
    });

    it('should validate required fields (roomCode and nickname)', done => {
      clientSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode }, response => {
        expect(response.success).toBe(false);
        expect(response.error).toContain('nickname');
        done();
      });
    });
  });

  describe('submit-vote event', () => {
    let poll;
    let hostSocket;
    let participantSocket;

    beforeEach(done => {
      hostSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      hostSocket.on('connect', () => {
        poll = pollManager.createPoll('Test question?', ['A', 'B', 'C'], hostSocket.id);

        // Open poll for voting
        pollManager.changePollState(poll.roomCode, 'open', hostSocket.id);

        // Create and join participant
        participantSocket = ioClient(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });

        participantSocket.on('connect', () => {
          participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, () => {
            done();
          });
        });
      });
    });

    afterEach(() => {
      if (hostSocket.connected) {
        hostSocket.disconnect();
      }
      if (participantSocket && participantSocket.connected) {
        participantSocket.disconnect();
      }
    });

    it('should accept valid vote submission', done => {
      participantSocket.emit(
        SUBMIT_VOTE,
        { roomCode: poll.roomCode, nickname: 'Alice', optionIndex: 0 },
        response => {
          expect(response.success).toBe(true);

          // Verify vote was recorded
          const currentPoll = pollManager.getPoll(poll.roomCode);
          expect(currentPoll.votes.get('Alice')).toBe(0);
          done();
        }
      );
    });

    it('should reject vote when voting is not open', done => {
      // Close voting
      pollManager.changePollState(poll.roomCode, 'closed', hostSocket.id);

      participantSocket.emit(
        SUBMIT_VOTE,
        { roomCode: poll.roomCode, nickname: 'Alice', optionIndex: 0 },
        response => {
          expect(response.success).toBe(false);
          expect(response.error).toBe('Voting is not open');
          done();
        }
      );
    });

    it('should reject vote with invalid option index', done => {
      participantSocket.emit(
        SUBMIT_VOTE,
        { roomCode: poll.roomCode, nickname: 'Alice', optionIndex: 99 },
        response => {
          expect(response.success).toBe(false);
          expect(response.error).toBe('Invalid option index');
          done();
        }
      );
    });

    it('should broadcast vote-update event to all clients in room', done => {
      // Host listens for vote updates
      hostSocket.on(VOTE_UPDATE, data => {
        expect(data.votes).toBeDefined();
        expect(data.percentages).toBeDefined();
        expect(data.votes[0]).toBe(1); // One vote for option A
        done();
      });

      // Participant submits vote
      setTimeout(() => {
        participantSocket.emit(SUBMIT_VOTE, {
          roomCode: poll.roomCode,
          nickname: 'Alice',
          optionIndex: 0,
        });
      }, 100);
    });

    it('should validate required fields (roomCode, nickname, optionIndex)', done => {
      participantSocket.emit(
        SUBMIT_VOTE,
        { roomCode: poll.roomCode, nickname: 'Alice' },
        response => {
          expect(response.success).toBe(false);
          expect(response.error).toContain('optionIndex');
          done();
        }
      );
    });

    it('should reject vote from participant not in room', done => {
      const outsiderSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      outsiderSocket.on('connect', () => {
        outsiderSocket.emit(
          SUBMIT_VOTE,
          { roomCode: poll.roomCode, nickname: 'Unknown', optionIndex: 0 },
          response => {
            expect(response.success).toBe(false);
            expect(response.error).toBe('Participant not in room');
            outsiderSocket.disconnect();
            done();
          }
        );
      });
    });
  });

  describe('Broadcast Schema Tests (US3)', () => {
    describe('vote-update broadcast schema (T078)', () => {
      let poll;
      let hostSocket;
      let participantSocket;

      beforeEach(done => {
        hostSocket = ioClient(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });

        hostSocket.on('connect', () => {
          poll = pollManager.createPoll('Test?', ['A', 'B', 'C'], hostSocket.id);
          pollManager.changePollState(poll.roomCode, 'open', hostSocket.id);

          participantSocket = ioClient(serverUrl, {
            transports: ['websocket'],
            forceNew: true,
          });

          participantSocket.on('connect', () => {
            participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, () =>
              done()
            );
          });
        });
      });

      afterEach(() => {
        if (hostSocket.connected) hostSocket.disconnect();
        if (participantSocket && participantSocket.connected) participantSocket.disconnect();
      });

      it('should validate vote-update broadcast contains votes array', done => {
        hostSocket.on(VOTE_UPDATE, data => {
          expect(data).toBeDefined();
          expect(data.votes).toBeDefined();
          expect(Array.isArray(data.votes)).toBe(true);
          expect(data.votes.length).toBe(3); // Should match number of options
          done();
        });

        setTimeout(() => {
          participantSocket.emit(SUBMIT_VOTE, {
            roomCode: poll.roomCode,
            nickname: 'Alice',
            optionIndex: 0,
          });
        }, 100);
      });

      it('should validate vote-update broadcast contains percentages array', done => {
        hostSocket.on(VOTE_UPDATE, data => {
          expect(data).toBeDefined();
          expect(data.percentages).toBeDefined();
          expect(Array.isArray(data.percentages)).toBe(true);
          expect(data.percentages.length).toBe(3); // Should match number of options
          expect(data.percentages[0]).toBe(100); // Alice voted for option 0
          expect(data.percentages[1]).toBe(0);
          expect(data.percentages[2]).toBe(0);
          done();
        });

        setTimeout(() => {
          participantSocket.emit(SUBMIT_VOTE, {
            roomCode: poll.roomCode,
            nickname: 'Alice',
            optionIndex: 0,
          });
        }, 100);
      });

      it('should validate votes are integers and percentages sum to 100', done => {
        hostSocket.on(VOTE_UPDATE, data => {
          // Validate votes are integers
          data.votes.forEach(count => {
            expect(Number.isInteger(count)).toBe(true);
            expect(count).toBeGreaterThanOrEqual(0);
          });

          // Validate percentages are integers
          data.percentages.forEach(percentage => {
            expect(Number.isInteger(percentage)).toBe(true);
            expect(percentage).toBeGreaterThanOrEqual(0);
            expect(percentage).toBeLessThanOrEqual(100);
          });

          // Validate percentages sum to 100 (allowing rounding tolerance)
          const sum = data.percentages.reduce((a, b) => a + b, 0);
          expect(sum).toBeGreaterThanOrEqual(99);
          expect(sum).toBeLessThanOrEqual(100);

          done();
        });

        setTimeout(() => {
          participantSocket.emit(SUBMIT_VOTE, {
            roomCode: poll.roomCode,
            nickname: 'Alice',
            optionIndex: 0,
          });
        }, 100);
      });
    });

    describe('participant-joined broadcast schema (T079)', () => {
      let poll;
      let hostSocket;

      beforeEach(done => {
        hostSocket = ioClient(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });

        hostSocket.on('connect', () => {
          poll = pollManager.createPoll('Test?', ['A', 'B'], hostSocket.id);
          done();
        });
      });

      afterEach(() => {
        if (hostSocket.connected) hostSocket.disconnect();
      });

      it('should validate participant-joined contains nickname string', done => {
        hostSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Host' }, () => {
          hostSocket.on(PARTICIPANT_JOINED, data => {
            expect(data).toBeDefined();
            expect(data.nickname).toBeDefined();
            expect(typeof data.nickname).toBe('string');
            expect(data.nickname.length).toBeGreaterThan(0);
            expect(data.nickname.length).toBeLessThanOrEqual(20); // FR-004 max length
            done();
          });

          const participantSocket = ioClient(serverUrl, {
            transports: ['websocket'],
            forceNew: true,
          });

          participantSocket.on('connect', () => {
            participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' });
          });
        });
      });

      it('should validate participant-joined contains participant count', done => {
        hostSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Host' }, () => {
          hostSocket.on(PARTICIPANT_JOINED, data => {
            expect(data).toBeDefined();
            expect(data.count).toBeDefined();
            expect(Number.isInteger(data.count)).toBe(true);
            expect(data.count).toBeGreaterThan(0);
            expect(data.count).toBeLessThanOrEqual(20); // FR-016 max participants
            expect(data.count).toBe(2); // Host + Alice
            done();
          });

          const participantSocket = ioClient(serverUrl, {
            transports: ['websocket'],
            forceNew: true,
          });

          participantSocket.on('connect', () => {
            participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' });
          });
        });
      });
    });

    describe('participant-left broadcast schema (T080)', () => {
      let poll;
      let hostSocket;
      let participantSocket;

      beforeEach(done => {
        hostSocket = ioClient(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });

        hostSocket.on('connect', () => {
          poll = pollManager.createPoll('Test?', ['A', 'B'], hostSocket.id);

          participantSocket = ioClient(serverUrl, {
            transports: ['websocket'],
            forceNew: true,
          });

          participantSocket.on('connect', () => {
            participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, () =>
              done()
            );
          });
        });
      });

      afterEach(() => {
        if (hostSocket.connected) hostSocket.disconnect();
        if (participantSocket && participantSocket.connected) participantSocket.disconnect();
      });

      it('should validate participant-left contains nickname string', done => {
        hostSocket.on(PARTICIPANT_LEFT, data => {
          expect(data).toBeDefined();
          expect(data.nickname).toBeDefined();
          expect(typeof data.nickname).toBe('string');
          expect(data.nickname).toBe('Alice');
          done();
        });

        setTimeout(() => {
          participantSocket.disconnect();
        }, 100);
      });

      it('should validate participant-left contains updated participant count', done => {
        hostSocket.on(PARTICIPANT_LEFT, data => {
          expect(data).toBeDefined();
          expect(data.count).toBeDefined();
          expect(Number.isInteger(data.count)).toBe(true);
          expect(data.count).toBeGreaterThanOrEqual(0);
          expect(data.count).toBe(0); // Only host remains (host not counted in participants)
          done();
        });

        setTimeout(() => {
          participantSocket.disconnect();
        }, 100);
      });
    });
  });
});
