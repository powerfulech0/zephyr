// Mock implementation of socketService for tests
export const joinSocketRoom = jest.fn();
export const joinRoom = jest.fn();
export const submitVote = jest.fn();
export const changePollState = jest.fn();
export const onParticipantJoined = jest.fn();
export const onParticipantLeft = jest.fn();
export const onVoteUpdate = jest.fn();
export const onPollStateChanged = jest.fn();
export const offParticipantJoined = jest.fn();
export const offParticipantLeft = jest.fn();
export const offVoteUpdate = jest.fn();
export const offPollStateChanged = jest.fn();
export const disconnect = jest.fn();
export const onConnectionStatus = jest.fn();
export const offConnectionStatus = jest.fn();
export const onReconnecting = jest.fn();
export const offReconnecting = jest.fn();
export const getConnectionStatus = jest.fn();

const mockSocket = {
  connected: true,
  id: 'mock-socket-id',
};

export default mockSocket;
