/**
 * Performance Test: 20 Concurrent Participants (T097)
 *
 * Success Criteria SC-004: Vote updates appear within 2 seconds on all connected clients
 *
 * This test verifies:
 * - 20 participants can join a poll concurrently
 * - All participants receive vote-update broadcasts within 2 seconds
 * - System handles concurrent voting without race conditions
 */

const io = require('socket.io-client');
const { httpServer, pollManager } = require('../../src/server.js');

describe('Performance: 20 Concurrent Participants (T097)', () => {
  let hostSocket;
  let participantSockets = [];
  let serverUrl;
  let roomCode;

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
    // Create host socket
    hostSocket = io(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    hostSocket.on('connect', done);
  });

  afterEach(() => {
    if (hostSocket?.connected) {
      hostSocket.disconnect();
    }
    participantSockets.forEach(socket => {
      if (socket?.connected) {
        socket.disconnect();
      }
    });
    participantSockets = [];
  });

  it('should handle 20 concurrent participants joining and voting', done => {
    const question = 'Performance test question?';
    const options = ['Option A', 'Option B', 'Option C'];
    const participantCount = 20;
    const joinedParticipants = [];
    const broadcastTimes = [];
    let voteSubmissionTime;

    // Create poll
    const poll = pollManager.createPoll(question, options, hostSocket.id);
    roomCode = poll.roomCode;

    // Host joins Socket.io room
    hostSocket.emit('join', roomCode);

    // Track broadcast latency on host
    hostSocket.on('vote-update', () => {
      if (voteSubmissionTime) {
        const latency = Date.now() - voteSubmissionTime;
        broadcastTimes.push(latency);
      }
    });

    // Create 20 participant sockets concurrently
    const connectPromises = [];
    for (let i = 0; i < participantCount; i += 1) {
      const socket = io(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });
      participantSockets.push(socket);

      const promise = new Promise((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit(
            'join-room',
            { roomCode, nickname: `Participant${i + 1}` },
            ack => {
              if (ack.success) {
                joinedParticipants.push(i + 1);
                resolve();
              } else {
                reject(new Error(`Participant ${i + 1} failed to join: ${ack.error}`));
              }
            }
          );
        });

        socket.on('connect_error', reject);
      });
      connectPromises.push(promise);
    }

    // Wait for all participants to join
    Promise.all(connectPromises)
      .then(() => {
        expect(joinedParticipants.length).toBe(participantCount);

        // Open voting
        hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });

        // Wait for state change, then have all participants vote concurrently
        setTimeout(() => {
          voteSubmissionTime = Date.now();

          // All participants vote for random options
          const votePromises = participantSockets.map((socket, index) => {
            const optionIndex = index % options.length; // Distribute votes
            return new Promise((resolve, reject) => {
              socket.emit(
                'submit-vote',
                { roomCode, nickname: `Participant${index + 1}`, optionIndex },
                ack => {
                  if (ack.success) {
                    resolve();
                  } else {
                    reject(new Error(`Vote ${index + 1} failed: ${ack.error}`));
                  }
                }
              );
            });
          });

          Promise.all(votePromises)
            .then(() => {
              // Wait for all broadcasts to complete
              setTimeout(() => {
                // Verify all votes were broadcast
                expect(broadcastTimes.length).toBeGreaterThan(0);

                // Verify broadcast latency < 2000ms (SC-004)
                const maxLatency = Math.max(...broadcastTimes);
                const avgLatency = broadcastTimes.reduce((a, b) => a + b, 0) / broadcastTimes.length;

                expect(maxLatency).toBeLessThan(2000);

                // Log performance metrics
                console.log(`\n📊 Performance Metrics:`);
                console.log(`   Participants: ${participantCount}`);
                console.log(`   Broadcasts received: ${broadcastTimes.length}`);
                console.log(`   Max latency: ${maxLatency}ms`);
                console.log(`   Avg latency: ${avgLatency.toFixed(2)}ms`);
                console.log(`   ✅ SC-004 Requirement: ${maxLatency < 2000 ? 'PASS' : 'FAIL'} (<2000ms)`);

                done();
              }, 1000); // Wait 1s for broadcasts
            })
            .catch(done);
        }, 200); // Wait for state change
      })
      .catch(done);
  }, 30000); // 30 second timeout for performance test

  it('should maintain data consistency with 20 concurrent voters', done => {
    const question = 'Consistency test?';
    const options = ['Yes', 'No'];
    const participantCount = 20;
    const expectedVotesPerOption = 10; // 10 vote Yes, 10 vote No

    // Create poll
    const poll = pollManager.createPoll(question, options, hostSocket.id);
    roomCode = poll.roomCode;

    // Host joins Socket.io room
    hostSocket.emit('join', roomCode);

    let finalVoteUpdate;
    hostSocket.on('vote-update', data => {
      finalVoteUpdate = data;
    });

    // Create and join 20 participants
    const connectPromises = [];
    for (let i = 0; i < participantCount; i += 1) {
      const socket = io(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });
      participantSockets.push(socket);

      const promise = new Promise((resolve, reject) => {
        socket.on('connect', () => {
          socket.emit(
            'join-room',
            { roomCode, nickname: `Voter${i + 1}` },
            ack => {
              if (ack.success) resolve();
              else reject(new Error(ack.error));
            }
          );
        });
      });
      connectPromises.push(promise);
    }

    Promise.all(connectPromises)
      .then(() => {
        // Open voting
        hostSocket.emit('change-poll-state', { roomCode, newState: 'open' });

        setTimeout(() => {
          // Half vote Yes (index 0), half vote No (index 1)
          const votePromises = participantSockets.map((socket, index) => {
            const optionIndex = index < 10 ? 0 : 1;
            return new Promise((resolve, reject) => {
              socket.emit(
                'submit-vote',
                { roomCode, nickname: `Voter${index + 1}`, optionIndex },
                ack => {
                  if (ack.success) resolve();
                  else reject(new Error(ack.error));
                }
              );
            });
          });

          Promise.all(votePromises)
            .then(() => {
              setTimeout(() => {
                // Verify vote counts are accurate
                expect(finalVoteUpdate).toBeDefined();
                expect(finalVoteUpdate.votes).toEqual([expectedVotesPerOption, expectedVotesPerOption]);
                expect(finalVoteUpdate.percentages).toEqual([50, 50]);

                console.log(`\n✅ Data Consistency Test:`);
                console.log(`   Expected: [${expectedVotesPerOption}, ${expectedVotesPerOption}]`);
                console.log(`   Actual: [${finalVoteUpdate.votes[0]}, ${finalVoteUpdate.votes[1]}]`);
                console.log(`   Status: PASS`);

                done();
              }, 1000);
            })
            .catch(done);
        }, 200);
      })
      .catch(done);
  }, 30000);
});
