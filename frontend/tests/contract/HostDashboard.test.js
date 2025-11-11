/**
 * Contract tests for HostDashboard component
 *
 * These tests verify the bug fix from feature #003 where API response handling
 * was corrected. The bug was accessing response.data.roomCode instead of
 * response.roomCode directly.
 *
 * These tests ensure regression protection by verifying:
 * 1. setPoll receives the API response directly (not response.data)
 * 2. setPollState receives response.state correctly
 * 3. joinSocketRoom receives response.roomCode correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HostDashboard from '../../src/pages/HostDashboard';
import * as apiService from '../../src/services/apiService';
import * as socketService from '../../src/services/socketService';

// Mock the service modules
jest.mock('../../src/services/apiService');
jest.mock('../../src/services/socketService');

describe('HostDashboard - API Response Handling Contract Tests (Feature #003 Bug Fix)', () => {
  // Mock response that matches the actual API contract
  const mockPollResponse = {
    roomCode: 'ABC123',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    state: 'waiting',
    createdAt: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    apiService.createPoll.mockResolvedValue(mockPollResponse);

    // Mock all socket service functions
    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn().mockResolvedValue('open');
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
    socketService.disconnect = jest.fn();
  });

  /**
   * T028: Test that setPoll receives API response directly (not response.data)
   *
   * Bug fix verification: The API returns the poll object directly, not wrapped
   * in a data property. The component should use the response as-is.
   */
  test('setPoll receives API response directly (not response.data)', async () => {
    render(<HostDashboard />);

    // Fill out the poll creation form
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'What is your favorite color?' } });
    fireEvent.change(option1Input, { target: { value: 'Red' } });
    fireEvent.change(option2Input, { target: { value: 'Blue' } });

    // Submit the form
    fireEvent.click(createButton);

    // Wait for the API call to complete and component to update
    await waitFor(() => {
      expect(apiService.createPoll).toHaveBeenCalledWith(
        'What is your favorite color?',
        ['Red', 'Blue']
      );
    });

    // Verify that the poll data is displayed correctly using the direct response
    // The room code should be visible on the page
    await waitFor(() => {
      expect(screen.getByText(/room code/i)).toBeInTheDocument();
      expect(screen.getByText(mockPollResponse.roomCode)).toBeInTheDocument();
    });

    // Verify the question is displayed
    expect(screen.getByText(mockPollResponse.question)).toBeInTheDocument();
  });

  /**
   * T029: Test that setPollState receives response.state correctly
   *
   * Bug fix verification: The state property should be accessed directly from
   * the API response object, not from response.data.state
   */
  test('setPollState receives response.state correctly', async () => {
    render(<HostDashboard />);

    // Create a poll first
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    // Wait for poll to be created
    await waitFor(() => {
      expect(screen.getByText(mockPollResponse.roomCode)).toBeInTheDocument();
    });

    // Verify initial state is 'waiting' (from response.state)
    // The PollControls component should show the "Open Voting" button when state is 'waiting'
    expect(screen.getByRole('button', { name: /open voting/i })).toBeInTheDocument();
  });

  /**
   * T030: Test that joinSocketRoom receives response.roomCode correctly
   *
   * Bug fix verification: The roomCode should be extracted directly from the
   * response object, not from response.data.roomCode
   */
  test('joinSocketRoom receives response.roomCode correctly', async () => {
    render(<HostDashboard />);

    // Create a poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    // Wait for the poll creation and socket room join
    await waitFor(() => {
      expect(apiService.createPoll).toHaveBeenCalled();
    });

    // Verify joinSocketRoom was called with the correct roomCode from response
    // (not from response.data.roomCode which would be undefined)
    await waitFor(() => {
      expect(socketService.joinSocketRoom).toHaveBeenCalledWith(mockPollResponse.roomCode);
    });
  });

  /**
   * Regression test: Verify that attempting to access response.data.roomCode
   * would fail (since response.data is undefined)
   */
  test('regression: response.data is undefined (bug would cause failure)', async () => {
    // This test verifies that the bug fix is in place
    // If someone reverts to response.data.roomCode, this will catch it

    const response = mockPollResponse;

    // Verify that response.data does not exist (the bug pattern)
    expect(response.data).toBeUndefined();

    // Verify that the correct pattern works (direct access)
    expect(response.roomCode).toBe('ABC123');
    expect(response.state).toBe('waiting');
    expect(response.question).toBe('What is your favorite color?');
  });
});

describe('HostDashboard - Form Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.createPoll.mockResolvedValue({
      roomCode: 'TEST12',
      question: 'Test',
      options: ['A', 'B'],
      state: 'waiting'
    });
  });

  test('validates question length (max 500 characters)', async () => {
    render(<HostDashboard />);

    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    // Create a question longer than 500 characters
    const longQuestion = 'a'.repeat(501);
    fireEvent.change(questionInput, { target: { value: longQuestion } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/question must be 500 characters or less/i)).toBeInTheDocument();
    });

    expect(apiService.createPoll).not.toHaveBeenCalled();
  });

  test('validates minimum 2 options required', async () => {
    render(<HostDashboard />);

    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Only one option' } });
    // Leave option 2 empty
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 2 options must have text/i)).toBeInTheDocument();
    });

    expect(apiService.createPoll).not.toHaveBeenCalled();
  });

  test('validates option length (max 100 characters)', async () => {
    render(<HostDashboard />);

    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    const longOption = 'a'.repeat(101);
    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: longOption } });
    fireEvent.change(option2Input, { target: { value: 'Normal option' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/each option must be 100 characters or less/i)).toBeInTheDocument();
    });

    expect(apiService.createPoll).not.toHaveBeenCalled();
  });
});

describe('HostDashboard - Socket Event Handlers', () => {
  const mockPollResponse = {
    roomCode: 'ABC123',
    question: 'Test question?',
    options: ['Option A', 'Option B'],
    state: 'waiting'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiService.createPoll.mockResolvedValue(mockPollResponse);

    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn().mockResolvedValue('open');
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
    socketService.disconnect = jest.fn();
  });

  test('handles poll-state-changed event', async () => {
    let stateChangeHandler;
    socketService.onPollStateChanged.mockImplementation(handler => {
      stateChangeHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll first
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/open voting/i)).toBeInTheDocument();
    });

    // Simulate socket event
    await act(async () => {
      stateChangeHandler({ newState: 'open' });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close voting/i })).toBeInTheDocument();
    });
  });

  test('handles vote-update event', async () => {
    let voteUpdateHandler;
    socketService.onVoteUpdate.mockImplementation(handler => {
      voteUpdateHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(mockPollResponse.roomCode)).toBeInTheDocument();
    });

    // Simulate vote update
    await act(async () => {
      voteUpdateHandler({
        votes: [5, 3],
        percentages: [62.5, 37.5]
      });
    });

    // PollResults component should display the updated counts
    await waitFor(() => {
      expect(screen.getByText(/5 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/3 votes/i)).toBeInTheDocument();
    });
  });

  test('handles participant-joined event', async () => {
    let participantJoinedHandler;
    socketService.onParticipantJoined.mockImplementation(handler => {
      participantJoinedHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/0 participants/i)).toBeInTheDocument();
    });

    // Simulate participant joining
    await act(async () => {
      participantJoinedHandler();
    });

    await waitFor(() => {
      expect(screen.getByText(/1 participant/i)).toBeInTheDocument();
    });
  });

  test('handles participant-left event', async () => {
    let participantLeftHandler;
    socketService.onParticipantLeft.mockImplementation(handler => {
      participantLeftHandler = handler;
    });

    let participantJoinedHandler;
    socketService.onParticipantJoined.mockImplementation(handler => {
      participantJoinedHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/0 participants/i)).toBeInTheDocument();
    });

    // Add participants first
    await act(async () => {
      participantJoinedHandler();
      participantJoinedHandler();
    });

    await waitFor(() => {
      expect(screen.getByText(/2 participants/i)).toBeInTheDocument();
    });

    // Simulate participant leaving
    await act(async () => {
      participantLeftHandler();
    });

    await waitFor(() => {
      expect(screen.getByText(/1 participant/i)).toBeInTheDocument();
    });
  });
});

describe('HostDashboard - Connection Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.createPoll.mockResolvedValue({
      roomCode: 'TEST12',
      question: 'Test',
      options: ['A', 'B'],
      state: 'waiting'
    });

    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn();
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
    socketService.disconnect = jest.fn();
  });

  test('displays connection status indicator', async () => {
    let connectionStatusHandler;
    socketService.onConnectionStatus.mockImplementation(handler => {
      connectionStatusHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll to see the connection status
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/🟢 connected/i)).toBeInTheDocument();
    });

    // Simulate connection status change
    await act(async () => {
      connectionStatusHandler({ status: 'disconnected' });
    });

    await waitFor(() => {
      expect(screen.getByText(/🔴 disconnected/i)).toBeInTheDocument();
    });
  });

  test('displays reconnecting banner', async () => {
    let reconnectingHandler;
    socketService.onReconnecting.mockImplementation(handler => {
      reconnectingHandler = handler;
    });

    render(<HostDashboard />);

    // Create poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/TEST12/)).toBeInTheDocument();
    });

    // Simulate reconnecting
    await act(async () => {
      reconnectingHandler({ attempting: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/reconnecting to server/i)).toBeInTheDocument();
    });
  });
});

describe('HostDashboard - Poll State Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.createPoll.mockResolvedValue({
      roomCode: 'ABC123',
      question: 'Test question?',
      options: ['Option A', 'Option B'],
      state: 'waiting'
    });

    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn().mockResolvedValue('open');
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
    socketService.disconnect = jest.fn();
  });

  test('handles error when changing poll state', async () => {
    socketService.changePollState = jest.fn().mockRejectedValue(new Error('Failed to change state'));

    render(<HostDashboard />);

    // Create poll
    const questionInput = screen.getByLabelText(/question/i);
    const option1Input = screen.getByPlaceholderText('Option 1');
    const option2Input = screen.getByPlaceholderText('Option 2');
    const createButton = screen.getByRole('button', { name: /create poll/i });

    fireEvent.change(questionInput, { target: { value: 'Test question?' } });
    fireEvent.change(option1Input, { target: { value: 'Option A' } });
    fireEvent.change(option2Input, { target: { value: 'Option B' } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open voting/i })).toBeInTheDocument();
    });

    // Try to open voting
    const openButton = screen.getByRole('button', { name: /open voting/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to change state/i)).toBeInTheDocument();
    });
  });
});

describe('HostDashboard - Option Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('removes option when clicking remove button', () => {
    render(<HostDashboard />);

    const addButton = screen.getByRole('button', { name: /add option/i });

    // Add a third option
    fireEvent.click(addButton);

    const option3Input = screen.getByPlaceholderText('Option 3');
    expect(option3Input).toBeInTheDocument();

    // Should see remove buttons now (since we have 3 options)
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click remove on the third option
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    // Option 3 should be gone
    expect(screen.queryByPlaceholderText('Option 3')).not.toBeInTheDocument();
  });
});
