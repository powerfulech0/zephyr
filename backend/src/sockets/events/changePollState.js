const logger = require('../../config/logger.js');
const jwt = require('jsonwebtoken');
const { CHANGE_POLL_STATE } = require('../../../../shared/eventTypes.js');
const { broadcastStateChange } = require('../emitters/broadcastStateChange.js');
const { websocketMessagesTotal } = require('../../services/metricsService.js');

/**
 * Handle change-poll-state Socket.io event
 * Changes poll state and persists to database
 * Note: Host authentication is optional (added in User Story 2)
 */
function handleChangePollState(socket, pollService, io) {
  socket.on(CHANGE_POLL_STATE, async (data, callback) => {
    // Track inbound WebSocket message (T065)
    websocketMessagesTotal.labels('inbound', CHANGE_POLL_STATE).inc();

    try {
      const { roomCode, newState, hostToken } = data;

      logger.info({ socketId: socket.id, roomCode, newState }, 'Received change-poll-state event');

      // Validate required fields
      if (!roomCode || !newState) {
        const error = 'Missing required fields: roomCode and newState';
        logger.warn({ socketId: socket.id, data }, error);
        if (callback) callback({ success: false, error });
        return;
      }

      // Host authentication check (T055) - only when HOST_AUTH_ENABLED=true
      if (process.env.HOST_AUTH_ENABLED === 'true') {
        if (!hostToken) {
          logger.warn(
            { socketId: socket.id, roomCode },
            'Host authentication required but token missing'
          );
          if (callback) {
            callback({
              success: false,
              error: 'Authentication required',
            });
          }
          return;
        }

        try {
          const secret = process.env.HOST_AUTH_SECRET;
          if (!secret) {
            logger.error('HOST_AUTH_SECRET not configured');
            if (callback) {
              callback({
                success: false,
                error: 'Authentication system misconfigured',
              });
            }
            return;
          }

          // Verify token
          const decoded = jwt.verify(hostToken, secret, {
            algorithms: ['HS256'],
          });

          // Validate role
          if (decoded.role !== 'host') {
            logger.warn(
              { socketId: socket.id, roomCode, role: decoded.role },
              'Invalid role in token'
            );
            if (callback) {
              callback({
                success: false,
                error: 'Insufficient permissions',
              });
            }
            return;
          }

          // Validate room code matches
          if (decoded.roomCode !== roomCode) {
            logger.warn(
              {
                socketId: socket.id,
                tokenRoomCode: decoded.roomCode,
                requestedRoomCode: roomCode,
              },
              'Room code mismatch in token'
            );
            if (callback) {
              callback({
                success: false,
                error: 'Token not valid for this poll',
              });
            }
            return;
          }

          logger.debug(
            { socketId: socket.id, roomCode },
            'Host authentication successful for poll state change'
          );
        } catch (error) {
          if (error.name === 'TokenExpiredError') {
            logger.warn(
              { socketId: socket.id, roomCode, expiredAt: error.expiredAt },
              'Expired authentication token'
            );
            if (callback) {
              callback({
                success: false,
                error: 'Authentication token expired',
              });
            }
            return;
          }

          logger.warn(
            { socketId: socket.id, roomCode, error: error.message },
            'Invalid authentication token'
          );
          if (callback) {
            callback({
              success: false,
              error: 'Invalid authentication token',
            });
          }
          return;
        }
      }

      // Get current poll state before change
      const currentPoll = await pollService.getPoll(roomCode);
      if (!currentPoll) {
        logger.warn({ socketId: socket.id, roomCode }, 'Poll not found for state change');
        if (callback) {
          callback({
            success: false,
            error: 'Poll not found',
          });
        }
        return;
      }

      const previousState = currentPoll.state;

      // Change poll state (persists to database)
      const updatedPoll = await pollService.changePollState(roomCode, newState);

      if (!updatedPoll) {
        logger.warn({ socketId: socket.id, roomCode }, 'Failed to change poll state');
        if (callback) {
          callback({
            success: false,
            error: 'Failed to change poll state',
          });
        }
        return;
      }

      logger.info(
        { socketId: socket.id, roomCode, previousState, newState },
        'Poll state changed and persisted successfully'
      );

      // Get full poll details for broadcast
      const pollWithDetails = await pollService.getPollWithDetails(roomCode);

      // Broadcast state change to all clients in room
      broadcastStateChange(io, roomCode, pollWithDetails, previousState);

      // Send acknowledgment to host
      if (callback) {
        callback({
          success: true,
          poll: pollWithDetails,
          previousState,
        });
      }
    } catch (error) {
      logger.error(
        { socketId: socket.id, error: error.message, data },
        'Error handling change-poll-state'
      );

      if (callback) {
        callback({
          success: false,
          error: 'Failed to change poll state',
        });
      }
    }
  });
}

module.exports = { handleChangePollState };
