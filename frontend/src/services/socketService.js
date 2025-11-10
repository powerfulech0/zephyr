import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Initialize socket with auto-reconnection config (T090)
const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['polling', 'websocket'],
  withCredentials: true,
});

// Connection status callbacks (T092)
let connectionStatusCallbacks = [];
let reconnectingCallbacks = [];

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);

  // Notify connection status listeners (T092)
  connectionStatusCallbacks.forEach(cb => cb({ status: 'connected', socketId: socket.id }));

  // Auto-rejoin room on reconnect (T090)
  const roomCode = sessionStorage.getItem('roomCode');
  const nickname = sessionStorage.getItem('nickname');

  if (roomCode && nickname) {
    console.log('Auto-rejoining room:', roomCode, 'as', nickname);
    socket.emit('join-room', { roomCode, nickname }, response => {
      if (response.success) {
        console.log('Successfully rejoined room');
      } else {
        console.error('Failed to rejoin room:', response.error);
      }
    });
  }
});

socket.on('disconnect', reason => {
  console.log('Disconnected from server:', reason);

  // Notify connection status listeners (T092)
  connectionStatusCallbacks.forEach(cb => cb({ status: 'disconnected', reason }));
});

socket.on('reconnecting', attemptNumber => {
  console.log('Reconnecting... attempt', attemptNumber);

  // Notify reconnecting listeners (T091)
  reconnectingCallbacks.forEach(cb => cb({ attempting: true, attemptNumber }));
});

socket.on('reconnect', attemptNumber => {
  console.log('Reconnected after', attemptNumber, 'attempts');

  // Notify reconnecting listeners (T091)
  reconnectingCallbacks.forEach(cb => cb({ attempting: false, attemptNumber }));
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed after maximum attempts');

  // Notify connection status listeners (T092)
  connectionStatusCallbacks.forEach(cb => cb({ status: 'failed', reason: 'Max attempts reached' }));
});

// Event emitters with Promise-based acknowledgments
// Simple room join for host (no nickname tracking)
export const joinSocketRoom = roomCode => {
  socket.emit('join', roomCode);
  console.log('Host joined room:', roomCode);
};

export const joinRoom = (roomCode, nickname) =>
  new Promise((resolve, reject) => {
    socket.emit('join-room', { roomCode, nickname }, response => {
      if (response.success) {
        resolve(response.poll);
      } else {
        reject(new Error(response.error));
      }
    });
  });

export const submitVote = (roomCode, nickname, optionIndex) =>
  new Promise((resolve, reject) => {
    socket.emit('submit-vote', { roomCode, nickname, optionIndex }, response => {
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error));
      }
    });
  });

export const changePollState = (roomCode, newState) =>
  new Promise((resolve, reject) => {
    console.log('Emitting change-poll-state:', {
      roomCode,
      newState,
      socketConnected: socket.connected,
    });
    socket.emit('change-poll-state', { roomCode, newState }, response => {
      console.log('Received response from change-poll-state:', response);
      if (response.success) {
        resolve(response.state);
      } else {
        reject(new Error(response.error));
      }
    });
  });

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

// Connection status listeners (T092)
export const onConnectionStatus = callback => {
  connectionStatusCallbacks.push(callback);
};

export const offConnectionStatus = callback => {
  connectionStatusCallbacks = connectionStatusCallbacks.filter(cb => cb !== callback);
};

// Reconnecting listeners (T091)
export const onReconnecting = callback => {
  reconnectingCallbacks.push(callback);
};

export const offReconnecting = callback => {
  reconnectingCallbacks = reconnectingCallbacks.filter(cb => cb !== callback);
};

// Get current connection status (T092)
export const getConnectionStatus = () => socket.connected;

export default socket;
