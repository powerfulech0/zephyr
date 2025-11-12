const logger = require('../../config/logger.js');
const { JOIN_ROOM, PARTICIPANT_JOINED, PARTICIPANT_REJOINED } = require('../../../../shared/eventTypes.js');
const { websocketMessagesTotal } = require('../../services/metricsService.js');

/**
 * Handle participant joining a poll room
 * Validates room code, nickname uniqueness, and room capacity
 * Broadcasts participant-joined event to all clients in room
 * Handles reconnection scenarios (existing nickname)
 */
function handleJoinRoom(socket, pollService, io) {
  socket.on(JOIN_ROOM, async (data, callback) => {
    // Track inbound WebSocket message (T065)
    websocketMessagesTotal.labels('inbound', JOIN_ROOM).inc();

    try {
      const { roomCode, nickname } = data;

      // Validate required fields
      if (!roomCode || !nickname) {
        const error = 'Missing required fields: roomCode and nickname';
        logger.warn({ socketId: socket.id, data }, error);
        if (callback) callback({ success: false, error });
        return;
      }

      // Add participant to poll (handles both new participants and reconnections)
      const participant = await pollService.addParticipant(roomCode, nickname, socket.id);

      // Join socket.io room
      socket.join(roomCode);

      // Store participant data on socket for later use
      // eslint-disable-next-line no-param-reassign
      socket.data = {
        ...socket.data,
        roomCode,
        nickname,
        participantId: participant.id,
      };

      // Get updated participant count
      const participants = await pollService.getParticipants(roomCode, true);
      const participantCount = participants.length;

      if (participant.reconnected) {
        // Reconnection scenario
        logger.info(
          { socketId: socket.id, roomCode, nickname, participantId: participant.id },
          'Participant reconnected to room'
        );

        // Broadcast reconnection to room
        io.to(roomCode).emit(PARTICIPANT_REJOINED, {
          nickname,
          count: participantCount,
          timestamp: new Date().toISOString(),
        });

        // Send acknowledgment with previous vote if exists
        if (callback) {
          const poll = await pollService.getPollWithDetails(roomCode);
          callback({
            success: true,
            reconnected: true,
            participantId: participant.id,
            previousVote: participant.previousVote,
            poll: {
              roomCode: poll.roomCode,
              question: poll.question,
              options: poll.options,
              state: poll.state,
              participantCount,
            },
          });
        }
      } else {
        // New participant
        logger.info(
          { socketId: socket.id, roomCode, nickname, participantId: participant.id },
          'New participant joined room'
        );

        // Broadcast new participant to all clients in room
        io.to(roomCode).emit(PARTICIPANT_JOINED, {
          nickname,
          count: participantCount,
          timestamp: new Date().toISOString(),
        });

        // Send acknowledgment with sanitized poll data
        if (callback) {
          const poll = await pollService.getPollWithDetails(roomCode);
          callback({
            success: true,
            reconnected: false,
            participantId: participant.id,
            poll: {
              roomCode: poll.roomCode,
              question: poll.question,
              options: poll.options,
              state: poll.state,
              participantCount,
            },
          });
        }
      }
    } catch (error) {
      logger.error(
        { socketId: socket.id, error: error.message, roomCode: data.roomCode, nickname: data.nickname },
        'Failed to handle join room'
      );

      if (callback) {
        callback({
          success: false,
          error: error.code === 'POLL_NOT_FOUND' ? 'Poll not found' : 'Failed to join room',
        });
      }
    }
  });
}

module.exports = handleJoinRoom;
