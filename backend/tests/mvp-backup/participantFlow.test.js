const { io: ioClient } = require('socket.io-client');
const { httpServer, pollManager } = require('../../src/server.js');
const {
  JOIN_ROOM,
  SUBMIT_VOTE,
  VOTE_UPDATE,
  PARTICIPANT_JOINED,
} = require('../../../shared/eventTypes.js');

describe('Participant Flow Integration Tests', () => {
  let serverUrl;
  let hostSocket;
  let participantSocket;
  let poll;

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
    hostSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    hostSocket.on('connect', () => {
      // Create poll
      poll = pollManager.createPoll(
        'What is your favorite programming language?',
        ['JavaScript', 'Python', 'Go', 'Rust'],
        hostSocket.id
      );

      // Open poll for voting
      pollManager.changePollState(poll.roomCode, 'open', hostSocket.id);

      // Create participant socket
      participantSocket = ioClient(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      participantSocket.on('connect', done);
    });
  });

  afterEach(() => {
    if (hostSocket && hostSocket.connected) {
      hostSocket.disconnect();
    }
    if (participantSocket && participantSocket.connected) {
      participantSocket.disconnect();
    }
  });

  it('should complete full participant lifecycle: join → vote → confirm → change vote', done => {
    let voteUpdateCount = 0;

    // Host listens for vote updates
    hostSocket.on(VOTE_UPDATE, data => {
      voteUpdateCount += 1;

      if (voteUpdateCount === 1) {
        // First vote: JavaScript (index 0)
        expect(data.votes).toEqual([1, 0, 0, 0]);
        expect(data.percentages).toEqual([100, 0, 0, 0]);
      } else if (voteUpdateCount === 2) {
        // Changed vote: Python (index 1)
        expect(data.votes).toEqual([0, 1, 0, 0]);
        expect(data.percentages).toEqual([0, 100, 0, 0]);
        done();
      }
    });

    // Step 1: Participant joins room
    participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, response => {
      expect(response.success).toBe(true);
      expect(response.poll.question).toBe('What is your favorite programming language?');

      // Step 2: Submit initial vote
      participantSocket.emit(
        SUBMIT_VOTE,
        { roomCode: poll.roomCode, nickname: 'Alice', optionIndex: 0 },
        voteResponse1 => {
          expect(voteResponse1.success).toBe(true);

          // Step 3: Change vote after 100ms
          setTimeout(() => {
            participantSocket.emit(
              SUBMIT_VOTE,
              { roomCode: poll.roomCode, nickname: 'Alice', optionIndex: 1 },
              voteResponse2 => {
                expect(voteResponse2.success).toBe(true);
              }
            );
          }, 100);
        }
      );
    });
  });

  it('should handle multiple participants voting simultaneously', done => {
    const participant2 = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    let voteUpdateCount = 0;

    hostSocket.on(VOTE_UPDATE, data => {
      voteUpdateCount += 1;

      if (voteUpdateCount === 2) {
        // Both participants have voted
        expect(data.votes).toEqual([1, 1, 0, 0]);
        expect(data.percentages).toEqual([50, 50, 0, 0]);
        participant2.disconnect();
        done();
      }
    });

    // Both participants join
    Promise.all([
      new Promise(resolve => {
        participantSocket.emit(
          JOIN_ROOM,
          { roomCode: poll.roomCode, nickname: 'Alice' },
          response => {
            expect(response.success).toBe(true);
            resolve();
          }
        );
      }),
      new Promise(resolve => {
        participant2.on('connect', () => {
          participant2.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Bob' }, response => {
            expect(response.success).toBe(true);
            resolve();
          });
        });
      }),
    ]).then(() => {
      // Both submit votes
      participantSocket.emit(SUBMIT_VOTE, {
        roomCode: poll.roomCode,
        nickname: 'Alice',
        optionIndex: 0,
      });

      setTimeout(() => {
        participant2.emit(SUBMIT_VOTE, {
          roomCode: poll.roomCode,
          nickname: 'Bob',
          optionIndex: 1,
        });
      }, 50);
    });
  });

  it('should prevent voting before joining room', done => {
    participantSocket.emit(
      SUBMIT_VOTE,
      { roomCode: poll.roomCode, nickname: 'NotJoined', optionIndex: 0 },
      response => {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Participant not in room');
        done();
      }
    );
  });

  it('should prevent voting when poll is closed', done => {
    // Participant joins
    participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, () => {
      // Host closes poll
      pollManager.changePollState(poll.roomCode, 'closed', hostSocket.id);

      // Participant tries to vote
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
  });

  it('should broadcast participant-joined event to existing participants', done => {
    const participant2 = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    // First participant joins
    participantSocket.emit(JOIN_ROOM, { roomCode: poll.roomCode, nickname: 'Alice' }, () => {
      // Listen for second participant joining
      participantSocket.on(PARTICIPANT_JOINED, data => {
        expect(data.nickname).toBe('Bob');
        expect(data.count).toBe(2);
        participant2.disconnect();
        done();
      });

      // Second participant joins
      participant2.on('connect', () => {
        setTimeout(() => {
          participant2.emit(JOIN_ROOM, {
            roomCode: poll.roomCode,
            nickname: 'Bob',
          });
        }, 100);
      });
    });
  });
});
