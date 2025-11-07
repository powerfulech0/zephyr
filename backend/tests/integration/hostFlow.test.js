const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app, httpServer, pollManager } = require('../../src/server.js');
const { CHANGE_POLL_STATE, POLL_STATE_CHANGED } = require('../../../shared/eventTypes.js');

describe('Host Poll Lifecycle Integration Test', () => {
  let hostSocket;
  let serverUrl;
  let createdPoll;

  beforeAll(done => {
    const existingPort = httpServer.address()?.port;
    if (existingPort) {
      serverUrl = `http://localhost:${existingPort}`;
      done();
    } else {
      httpServer.listen(0, () => {
        const port = httpServer.address().port;
        serverUrl = `http://localhost:${port}`;
        done();
      });
    }
  });

  afterAll(done => {
    if (hostSocket?.connected) {
      hostSocket.disconnect();
    }
    httpServer.close(done);
  });

  it('should complete full host lifecycle: create → open → close poll', async () => {
    // Step 1: Host creates a poll via HTTP API
    const createResponse = await request(app)
      .post('/api/polls')
      .send({
        question: 'What is the best testing framework?',
        options: ['Jest', 'Mocha', 'Vitest', 'Jasmine'],
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.poll.state).toBe('waiting');
    createdPoll = createResponse.body.poll;

    // Step 2: Host connects via WebSocket
    hostSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise(resolve => {
      hostSocket.on('connect', resolve);
    });

    // Update the poll's hostSocketId to match the connected socket
    const poll = pollManager.getPoll(createdPoll.roomCode);
    poll.hostSocketId = hostSocket.id;
    pollManager.socketRoomMap.set(hostSocket.id, createdPoll.roomCode);

    // Step 3: Verify poll is in waiting state
    const getResponse = await request(app)
      .get(`/api/polls/${createdPoll.roomCode}`)
      .expect(200);

    expect(getResponse.body.poll.state).toBe('waiting');

    // Step 4: Host opens the poll for voting
    const openResult = await new Promise(resolve => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: createdPoll.roomCode, newState: 'open' },
        resolve
      );
    });

    expect(openResult.success).toBe(true);
    expect(openResult.poll.state).toBe('open');
    expect(openResult.previousState).toBe('waiting');

    // Step 5: Verify poll state changed to open
    const afterOpenResponse = await request(app)
      .get(`/api/polls/${createdPoll.roomCode}`)
      .expect(200);

    expect(afterOpenResponse.body.poll.state).toBe('open');

    // Step 6: Host closes the poll
    const closeResult = await new Promise(resolve => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: createdPoll.roomCode, newState: 'closed' },
        resolve
      );
    });

    expect(closeResult.success).toBe(true);
    expect(closeResult.poll.state).toBe('closed');
    expect(closeResult.previousState).toBe('open');

    // Step 7: Verify final state is closed
    const finalResponse = await request(app)
      .get(`/api/polls/${createdPoll.roomCode}`)
      .expect(200);

    expect(finalResponse.body.poll.state).toBe('closed');

    // Step 8: Verify host cannot reopen closed poll
    const reopenResult = await new Promise(resolve => {
      hostSocket.emit(
        CHANGE_POLL_STATE,
        { roomCode: createdPoll.roomCode, newState: 'open' },
        resolve
      );
    });

    expect(reopenResult.success).toBe(false);
    expect(reopenResult.error).toContain('Cannot reopen');

    // Verify state remained closed
    const verifyClosedResponse = await request(app)
      .get(`/api/polls/${createdPoll.roomCode}`)
      .expect(200);

    expect(verifyClosedResponse.body.poll.state).toBe('closed');
  });

  it('should broadcast state changes to all connected clients', async () => {
    // Create poll
    const createResponse = await request(app)
      .post('/api/polls')
      .send({
        question: 'Broadcast test?',
        options: ['Yes', 'No'],
      })
      .expect(201);

    const poll = createResponse.body.poll;

    // Connect host socket
    hostSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise(resolve => {
      hostSocket.on('connect', resolve);
    });

    // Update poll host socket ID
    const pollObj = pollManager.getPoll(poll.roomCode);
    pollObj.hostSocketId = hostSocket.id;
    pollManager.socketRoomMap.set(hostSocket.id, poll.roomCode);

    // Connect participant socket
    const participantSocket = ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise(resolve => {
      participantSocket.on('connect', resolve);
    });

    // Join room (both sockets)
    hostSocket.emit('join', poll.roomCode);
    participantSocket.emit('join', poll.roomCode);

    // Setup broadcast listener
    const broadcastReceived = new Promise(resolve => {
      participantSocket.on(POLL_STATE_CHANGED, data => {
        resolve(data);
      });
    });

    // Host changes state
    hostSocket.emit(CHANGE_POLL_STATE, {
      roomCode: poll.roomCode,
      newState: 'open',
    });

    // Wait for broadcast
    const broadcastData = await broadcastReceived;
    expect(broadcastData.roomCode).toBe(poll.roomCode);
    expect(broadcastData.newState).toBe('open');
    expect(broadcastData.previousState).toBe('waiting');

    // Cleanup
    participantSocket.disconnect();
  });
});
