// Mock implementation of apiService for tests
export const createPoll = jest.fn();
export const getPoll = jest.fn();
export const checkHealth = jest.fn();

export default {
  createPoll,
  getPoll,
  checkHealth,
};
