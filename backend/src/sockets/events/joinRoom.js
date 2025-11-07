const logger = require('../../config/logger.js');
const { JOIN_ROOM, PARTICIPANT_JOINED } = require('../../../../shared/eventTypes.js');

/**
 * Handle participant joining a poll room
 * Validates room code, nickname uniqueness, and room capacity
 * Broadcasts participant-joined event to all clients in room
 */
function handleJoinRoom(socket, pollManager, io) {
  socket.on(JOIN_ROOM, (data, callback) => {
    const { roomCode, nickname } = data;

    // Validate required fields
    if (!roomCode || !nickname) {
      const error = 'Missing required fields: roomCode and nickname';
      logger.warn({ socketId: socket.id, data }, error);
      if (callback) callback({ success: false, error });
      return;
    }

    // Add participant to poll
    const result = pollManager.addParticipant(roomCode, nickname, socket.id);

    if (!result.success) {
      logger.warn(
        { socketId: socket.id, roomCode, nickname, error: result.error },
        'Failed to add participant'
      );
      if (callback) callback(result);
      return;
    }

    // Join socket.io room
    socket.join(roomCode);

    logger.info(
      { socketId: socket.id, roomCode, nickname },
      'Participant joined room'
    );

    // Broadcast to all clients in room (including joiner)
    const participantCount = result.poll.participants.size;
    io.to(roomCode).emit(PARTICIPANT_JOINED, {
      nickname,
      participantCount,
      timestamp: new Date().toISOString(),
    });

    // Send acknowledgment with sanitized poll data
    if (callback) {
      callback({
        success: true,
        poll: {
          roomCode: result.poll.roomCode,
          question: result.poll.question,
          options: result.poll.options,
          state: result.poll.state,
          participantCount,
        },
      });
    }
  });
}

module.exports = handleJoinRoom;
