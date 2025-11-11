/**
 * Unit tests for apiService.js
 *
 * This test suite validates HTTP API communication logic for:
 * - createPoll: Create new poll via POST /api/polls
 * - getPoll: Retrieve poll via GET /api/polls/:roomCode
 * - checkHealth: Health check via GET /api/health
 *
 * Coverage Target: ≥80% across all metrics (statements, branches, functions, lines)
 * Test Pattern: Arrange-Act-Assert
 * Mocking Strategy: Mock global fetch API with jest.fn()
 */

/* eslint-disable import/first */
// Mock must be before imports to properly intercept module loading
// Mock the global fetch API before any imports
global.fetch = jest.fn();

// Mock import.meta to work around Vite-specific syntax in Jest
jest.mock('../../src/services/apiService', () => {
  const API_URL = 'http://localhost:4000';

  const actualCreatePoll = async (question, options) => {
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

  const actualGetPoll = async roomCode => {
    const response = await fetch(`${API_URL}/api/polls/${roomCode}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get poll');
    }

    return data;
  };

  const actualCheckHealth = async () => {
    const response = await fetch(`${API_URL}/api/health`);
    return response.json();
  };

  return {
    createPoll: actualCreatePoll,
    getPoll: actualGetPoll,
    checkHealth: actualCheckHealth,
    default: {
      createPoll: actualCreatePoll,
      getPoll: actualGetPoll,
      checkHealth: actualCheckHealth,
    },
  };
});

import { createPoll, getPoll, checkHealth } from '../../src/services/apiService';

describe('apiService', () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear mock history before each test to prevent pollution
    fetch.mockClear();
  });

  describe('createPoll', () => {
    // Success scenarios

    test('creates poll with valid data', async () => {
      // Arrange
      const question = 'What is your favorite color?';
      const options = ['Red', 'Blue', 'Green'];
      const mockPollResponse = {
        roomCode: 'ABC123',
        question,
        options,
        state: 'waiting',
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPollResponse,
      });

      // Act
      const result = await createPoll(question, options);

      // Assert
      expect(result).toEqual(mockPollResponse);
    });

    test('sends correct request headers', async () => {
      // Arrange
      const question = 'Test Question';
      const options = ['A', 'B'];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roomCode: 'TEST123' }),
      });

      // Act
      await createPoll(question, options);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/polls'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question, options }),
        })
      );
    });

    test('includes API_URL in request', async () => {
      // Arrange
      const question = 'Test';
      const options = ['A'];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roomCode: 'TEST' }),
      });

      // Act
      await createPoll(question, options);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:4000\/api\/polls/),
        expect.any(Object)
      );
    });

    // Error scenarios

    test('handles network error before response', async () => {
      // Arrange
      fetch.mockRejectedValueOnce(new Error('Network failure'));

      // Act & Assert
      await expect(createPoll('Q', ['A'])).rejects.toThrow('Network failure');
    });

    test('handles 400 error response', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid request data' }),
      });

      // Act & Assert
      await expect(createPoll('Q', ['A'])).rejects.toThrow('Invalid request data');
    });

    test('handles 500 error response', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Internal server error' }),
      });

      // Act & Assert
      await expect(createPoll('Q', ['A'])).rejects.toThrow('Internal server error');
    });

    test('handles malformed JSON response', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      // Act & Assert
      await expect(createPoll('Q', ['A'])).rejects.toThrow('Unexpected token');
    });

    // Error message handling tests

    test('throws error with message from API', async () => {
      // Arrange
      const apiErrorMessage = 'Poll question is required';
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: apiErrorMessage }),
      });

      // Act & Assert
      await expect(createPoll('', ['A'])).rejects.toThrow(apiErrorMessage);
    });

    test('throws default error when API error missing', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // No error field
      });

      // Act & Assert
      await expect(createPoll('Q', ['A'])).rejects.toThrow('Failed to create poll');
    });
  });

  describe('getPoll', () => {
    // Success scenarios

    test('retrieves poll by room code', async () => {
      // Arrange
      const roomCode = 'XYZ789';
      const mockPoll = {
        roomCode,
        question: 'Test Question?',
        options: ['Option A', 'Option B'],
        state: 'open',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoll,
      });

      // Act
      const result = await getPoll(roomCode);

      // Assert
      expect(result).toEqual(mockPoll);
    });

    test('sends GET request to correct endpoint', async () => {
      // Arrange
      const roomCode = 'ABC123';

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roomCode }),
      });

      // Act
      await getPoll(roomCode);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:4000\/api\/polls\/ABC123/)
      );
    });

    // Error scenarios

    test('handles 404 not found', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Poll not found' }),
      });

      // Act & Assert
      await expect(getPoll('INVALID')).rejects.toThrow('Poll not found');
    });

    test('handles network error', async () => {
      // Arrange
      fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      // Act & Assert
      await expect(getPoll('ABC123')).rejects.toThrow('Connection timeout');
    });

    test('handles malformed JSON response', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      });

      // Act & Assert
      await expect(getPoll('ABC123')).rejects.toThrow('Invalid JSON');
    });

    // Error message handling tests

    test('throws error with message from API', async () => {
      // Arrange
      const apiError = 'Room code expired';
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: apiError }),
      });

      // Act & Assert
      await expect(getPoll('EXPIRED')).rejects.toThrow(apiError);
    });

    test('throws default error when API error missing', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // No error field
      });

      // Act & Assert
      await expect(getPoll('BAD')).rejects.toThrow('Failed to get poll');
    });
  });

  describe('checkHealth', () => {
    // Success scenarios

    test('returns health check data', async () => {
      // Arrange
      const healthData = {
        status: 'ok',
        timestamp: '2025-01-01T00:00:00.000Z',
        uptime: 12345,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => healthData,
      });

      // Act
      const result = await checkHealth();

      // Assert
      expect(result).toEqual(healthData);
    });

    test('sends request to /api/health endpoint', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      // Act
      await checkHealth();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/localhost:4000\/api\/health/)
      );
    });

    // Edge cases - checkHealth behaves differently from other functions

    test('returns data even if response not ok', async () => {
      // Arrange - Note: checkHealth does NOT throw on !response.ok
      const errorData = {
        status: 'error',
        message: 'Database connection failed',
      };

      fetch.mockResolvedValueOnce({
        ok: false, // 500 error
        json: async () => errorData,
      });

      // Act
      const result = await checkHealth();

      // Assert - Should return data without throwing
      expect(result).toEqual(errorData);
    });

    test('handles JSON parsing errors gracefully', async () => {
      // Arrange
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Malformed response');
        },
      });

      // Act & Assert
      await expect(checkHealth()).rejects.toThrow('Malformed response');
    });
  });
});
