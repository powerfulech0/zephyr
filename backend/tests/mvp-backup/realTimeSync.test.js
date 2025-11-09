const io = require('socket.io-client');
const { httpServer, pollManager } = require('../../src/server.js');

describe('User Story 3: Real-time vote synchronization', () => {
  let hostSocket;
  let participant1Socket;
  let participant2Socket;
  let roomCode;
  let serverUrl;

  beforeAll(done => {
    const existingPort = httpServer.address()?.port;
    if (existingPort) {
      serverUrl = `http://localhost:${existingPort}`;
      done();
    } else {
      httpServer.listen(0, () => {
        const {port} = httpServer.address();
        serverUrl = `http://localhost:${port}`;
        done();
      });
    }
  });

  afterAll(done => {
    if (httpServer.listening) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  beforeEach(done => {
    // Create all 3 socket connections
    hostSocket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    participant1Socket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    participant2Socket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    // Wait for all connections
    let connected = 0;
    const checkAllConnected = () => {
      connected += 1;
      if (connected === 3) done();
    };

    hostSocket.on('connect', checkAllConnected);
    participant1Socket.on('connect', checkAllConnected);
    participant2Socket.on('connect', checkAllConnected);
  });

  afterEach(() => {
    if (hostSocket.connected) hostSocket.disconnect();
    if (participant1Socket.connected) participant1Socket.disconnect();
    if (participant2Socket.connected) participant2Socket.disconnect();
  });

  describe('Multi-client vote synchronization (T077)', () => {
    test('should broadcast vote updates to all clients in room in real-time', done => {
      const question = 'What is your favorite color?';
      const options = ['Red', 'Blue', 'Green'];
      let voteUpdateCount = 0;
      const expectedUpdates = 2; // Host and participant1 should receive update

      // Create poll directly with host socket ID
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room (not as participant)
      hostSocket.emit('join', roomCode);

      // Participant1 joins room
      participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, p1Ack => {
        expect(p1Ack.success).toBe(true);

        // Participant2 joins room
        participant2Socket.emit('join-room', { roomCode, nickname: 'Bob' }, p2Ack => {
          expect(p2Ack.success).toBe(true);

          // Setup vote-update listeners on host and participant1
          const voteUpdateHandler = data => {
            expect(data.votes).toBeDefined();
            expect(data.percentages).toBeDefined();
            expect(data.votes[0]).toBe(1); // Bob voted for Red (index 0)
            expect(data.percentages[0]).toBe(100);
            voteUpdateCount += 1;

            if (voteUpdateCount === expectedUpdates) {
              done();
            }
          };

          hostSocket.on('vote-update', voteUpdateHandler);
          participant1Socket.on('vote-update', voteUpdateHandler);

          // Open voting first
          hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });

          // Wait for state change, then participant2 votes
          setTimeout(() => {
            participant2Socket.emit(
              'submit-vote',
              { roomCode, nickname: 'Bob', optionIndex: 0 },
              voteAck => {
                expect(voteAck.success).toBe(true);
              }
            );
          }, 100);
        });
      });
    }, 10000);

    test('should synchronize multiple sequential votes across all clients', done => {
      const question = 'Best programming language?';
      const options = ['JavaScript', 'Python', 'Go'];
      const voteUpdates = [];

      // Create poll
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room
      hostSocket.emit('join', roomCode);

      // Track vote updates on host socket
      hostSocket.on('vote-update', data => {
        voteUpdates.push(data);

        if (voteUpdates.length === 2) {
          // First update: Alice voted for JavaScript
          expect(voteUpdates[0].votes).toEqual([1, 0, 0]);
          expect(voteUpdates[0].percentages).toEqual([100, 0, 0]);

          // Second update: Bob voted for Python
          expect(voteUpdates[1].votes).toEqual([1, 1, 0]);
          expect(voteUpdates[1].percentages).toEqual([50, 50, 0]);
          done();
        }
      });

      // Participants join
      Promise.all([
        new Promise(resolve => {
          participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, ack => {
            expect(ack.success).toBe(true);
            resolve();
          });
        }),
        new Promise(resolve => {
          participant2Socket.emit('join-room', { roomCode, nickname: 'Bob' }, ack => {
            expect(ack.success).toBe(true);
            resolve();
          });
        }),
      ]).then(() => {
        // Open voting
        hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });

        // Sequential votes
        setTimeout(() => {
          participant1Socket.emit('submit-vote', {
            roomCode,
            nickname: 'Alice',
            optionIndex: 0,
          });

          setTimeout(() => {
            participant2Socket.emit('submit-vote', {
              roomCode,
              nickname: 'Bob',
              optionIndex: 1,
            });
          }, 100);
        }, 100);
      });
    }, 10000);

    test('should handle vote changes and broadcast updated counts', done => {
      const question = 'Favorite framework?';
      const options = ['React', 'Vue', 'Angular'];
      let updateCount = 0;

      // Create poll
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room
      hostSocket.emit('join', roomCode);

      // Participant joins
      participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, ack => {
        expect(ack.success).toBe(true);

        hostSocket.on('vote-update', data => {
          updateCount += 1;

          if (updateCount === 1) {
            // First vote: React
            expect(data.votes).toEqual([1, 0, 0]);
          } else if (updateCount === 2) {
            // Changed vote: Vue
            expect(data.votes).toEqual([0, 1, 0]);
            done();
          }
        });

        // Open voting
        hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });

        setTimeout(() => {
          // Initial vote
          participant1Socket.emit(
            'submit-vote',
            { roomCode, nickname: 'Alice', optionIndex: 0 },
            () => {
              // Change vote
              setTimeout(() => {
                participant1Socket.emit('submit-vote', {
                  roomCode,
                  nickname: 'Alice',
                  optionIndex: 1,
                });
              }, 100);
            }
          );
        }, 100);
      });
    }, 10000);
  });

  describe('Participant count synchronization', () => {
    test('should broadcast participant-joined events to all clients', done => {
      const question = 'Test question?';
      const options = ['A', 'B'];
      let joinEventCount = 0;

      // Create poll
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room
      hostSocket.emit('join', roomCode);

      // Listen for participant-joined on host socket
      hostSocket.on('participant-joined', data => {
        joinEventCount += 1;
        expect(data.nickname).toBeDefined();
        expect(data.count).toBeGreaterThan(0);

        if (joinEventCount === 2) {
          // Received both Alice and Bob join events
          expect(data.count).toBe(2); // Alice + Bob (host not a participant)
          done();
        }
      });

      // Participants join
      participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, () => {
        setTimeout(() => {
          participant2Socket.emit('join-room', { roomCode, nickname: 'Bob' }, () => {});
        }, 100);
      });
    }, 10000);

    test('should broadcast participant-left events when clients disconnect', done => {
      const question = 'Test question?';
      const options = ['A', 'B'];

      // Create poll
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room
      hostSocket.emit('join', roomCode);

      // Listen for participant-left on host socket
      hostSocket.on('participant-left', data => {
        expect(data.nickname).toBe('Alice');
        expect(data.count).toBe(1); // Only Bob remains (host not a participant)
        done();
      });

      // Participants join
      Promise.all([
        new Promise(resolve => {
          participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, resolve);
        }),
        new Promise(resolve => {
          participant2Socket.emit('join-room', { roomCode, nickname: 'Bob' }, resolve);
        }),
      ]).then(() => {
        // Disconnect participant1
        setTimeout(() => {
          participant1Socket.disconnect();
        }, 100);
      });
    }, 10000);
  });

  describe('Poll state change synchronization', () => {
    test('should broadcast poll-state-changed to all clients in room', done => {
      const question = 'Test state sync?';
      const options = ['Yes', 'No'];
      let stateChangeCount = 0;

      // Create poll
      const poll = pollManager.createPoll(question, options, hostSocket.id);
      roomCode = poll.roomCode;

      // Host joins Socket.io room
      hostSocket.emit('join', roomCode);

      // Both clients listen for state changes
      const stateChangeHandler = data => {
        expect(data.newState).toBe('open');
        expect(data.previousState).toBe('waiting');
        stateChangeCount += 1;

        if (stateChangeCount === 2) {
          // Both host and participant received update
          done();
        }
      };

      hostSocket.on('poll-state-changed', stateChangeHandler);
      participant1Socket.on('poll-state-changed', stateChangeHandler);

      // Participant joins
      participant1Socket.emit('join-room', { roomCode, nickname: 'Alice' }, () => {
        // Host changes state after participant joins
        setTimeout(() => {
          hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });
        }, 100);
      });
    }, 10000);
  });
});
