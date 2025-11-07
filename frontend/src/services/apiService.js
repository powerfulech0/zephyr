const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const createPoll = async (question, options) => {
  const response = await fetch(`${API_URL}/api/polls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, options }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create poll');
  }

  return data;
};

export const getPoll = async roomCode => {
  const response = await fetch(`${API_URL}/api/polls/${roomCode}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get poll');
  }

  return data;
};

export const checkHealth = async () => {
  const response = await fetch(`${API_URL}/api/health`);
  return response.json();
};

export default {
  createPoll,
  getPoll,
  checkHealth,
};
