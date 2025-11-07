import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Initialize socket with auto-reconnection config
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', reason => {
  console.log('Disconnected from server:', reason);
});

socket.on('reconnect', attemptNumber => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

// Event emitters with Promise-based acknowledgments
export const joinRoom = (roomCode, nickname) => {
  return new Promise((resolve, reject) => {
    socket.emit('join-room', { roomCode, nickname }, response => {
      if (response.success) {
        resolve(response.poll);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const submitVote = (roomCode, nickname, optionIndex) => {
  return new Promise((resolve, reject) => {
    socket.emit('submit-vote', { roomCode, nickname, optionIndex }, response => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

export const changePollState = (roomCode, newState) => {
  return new Promise((resolve, reject) => {
    socket.emit('change-poll-state', { roomCode, newState }, response => {
      if (response.success) {
        resolve(response.state);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

// Event listeners
export const onParticipantJoined = callback => {
  socket.on('participant-joined', callback);
};

export const onParticipantLeft = callback => {
  socket.on('participant-left', callback);
};

export const onVoteUpdate = callback => {
  socket.on('vote-update', callback);
};

export const onPollStateChanged = callback => {
  socket.on('poll-state-changed', callback);
};

// Cleanup listeners
export const offParticipantJoined = callback => {
  socket.off('participant-joined', callback);
};

export const offParticipantLeft = callback => {
  socket.off('participant-left', callback);
};

export const offVoteUpdate = callback => {
  socket.off('vote-update', callback);
};

export const offPollStateChanged = callback => {
  socket.off('poll-state-changed', callback);
};

// Disconnect socket
export const disconnect = () => {
  socket.disconnect();
};

export default socket;
