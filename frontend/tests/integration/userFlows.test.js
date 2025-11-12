/**
 * End-to-End User Flow Tests (T096)
 *
 * Tests complete user workflows from creation to voting
 * These tests simulate real user interactions across components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock socket service
jest.mock('../../src/services/socketService', () => ({
  joinRoom: jest.fn(),
  submitVote: jest.fn(),
  changePollState: jest.fn(),
  onPollStateChanged: jest.fn(),
  onVoteUpdate: jest.fn(),
  onParticipantJoined: jest.fn(),
  onParticipantLeft: jest.fn(),
  onConnectionStatus: jest.fn(),
  onReconnecting: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock API service
jest.mock('../../src/services/apiService', () => ({
  createPoll: jest.fn(),
  getPoll: jest.fn(),
}));

import HostDashboard from '../../src/pages/HostDashboard';
import JoinPage from '../../src/pages/JoinPage';
import VotePage from '../../src/pages/VotePage';
import { createPoll } from '../../src/services/apiService';
import { joinRoom, submitVote, changePollState } from '../../src/services/socketService';

describe('Host Poll Creation Flow (User Story 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow host to create a poll with question and options', async () => {
    const mockPoll = {
      roomCode: 'AB3K9T',
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
      state: 'waiting',
    };

    createPoll.mockResolvedValue(mockPoll);

    render(
      <BrowserRouter>
        <HostDashboard />
      </BrowserRouter>
    );

    // Host enters question
    const questionInput = screen.getByLabelText(/question/i);
    fireEvent.change(questionInput, { target: { value: mockPoll.question } });

    // Host enters options
    const optionInputs = screen.getAllByPlaceholderText(/option/i);
    fireEvent.change(optionInputs[0], { target: { value: 'Red' } });
    fireEvent.change(optionInputs[1], { target: { value: 'Blue' } });

    // Add third option
    const addButton = screen.getByText('Add Option');
    fireEvent.click(addButton);

    await waitFor(() => {
      const updatedInputs = screen.getAllByPlaceholderText(/option/i);
      expect(updatedInputs.length).toBe(3);
    });

    const updatedInputs = screen.getAllByPlaceholderText(/option/i);
    fireEvent.change(updatedInputs[2], { target: { value: 'Green' } });

    // Submit form
    const createButton = screen.getByText('Create Poll');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createPoll).toHaveBeenCalledWith(
        'What is your favorite color?',
        ['Red', 'Blue', 'Green']
      );
    });
  });

  it('should validate form and show error for missing question', async () => {
    render(
      <BrowserRouter>
        <HostDashboard />
      </BrowserRouter>
    );

    const createButton = screen.getByText('Create Poll');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Question is required')).toBeInTheDocument();
    });
  });

  it('should validate form and require at least 2 options', async () => {
    render(
      <BrowserRouter>
        <HostDashboard />
      </BrowserRouter>
    );

    const questionInput = screen.getByLabelText(/question/i);
    fireEvent.change(questionInput, { target: { value: 'Test question?' } });

    // Leave options empty
    const createButton = screen.getByText('Create Poll');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('At least 2 options must have text')).toBeInTheDocument();
    });
  });
});

describe('Participant Join and Vote Flow (User Story 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup sessionStorage mock
    Storage.prototype.getItem = jest.fn((key) => {
      const store = {
        poll: JSON.stringify({
          roomCode: 'AB3K9T',
          question: 'What is your favorite color?',
          options: ['Red', 'Blue', 'Green'],
          state: 'open',
        }),
        nickname: 'Alice',
        roomCode: 'AB3K9T',
        participantId: '12345',
      };
      return store[key];
    });
  });

  it('should render vote page with poll information', () => {
    render(
      <BrowserRouter>
        <VotePage />
      </BrowserRouter>
    );

    expect(screen.getByText('What is your favorite color?')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('AB3K9T')).toBeInTheDocument();
  });

  it('should allow participant to submit a vote', async () => {
    submitVote.mockResolvedValue();

    render(
      <BrowserRouter>
        <VotePage />
      </BrowserRouter>
    );

    const blueOption = screen.getByText('Blue').closest('button');
    fireEvent.click(blueOption);

    await waitFor(() => {
      expect(submitVote).toHaveBeenCalledWith('AB3K9T', '12345', 1);
    });
  });

  it('should show voting closed message when poll state is closed', () => {
    Storage.prototype.getItem = jest.fn((key) => {
      const store = {
        poll: JSON.stringify({
          roomCode: 'AB3K9T',
          question: 'Test question?',
          options: ['A', 'B'],
          state: 'closed',
        }),
        nickname: 'Bob',
        roomCode: 'AB3K9T',
        participantId: '67890',
      };
      return store[key];
    });

    render(
      <BrowserRouter>
        <VotePage />
      </BrowserRouter>
    );

    expect(screen.getByText('🔒 Voting has been closed')).toBeInTheDocument();
  });
});

describe('Host Poll Control Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow host to change poll state from waiting to open', async () => {
    changePollState.mockResolvedValue();

    const mockPoll = {
      roomCode: 'AB3K9T',
      question: 'Test question?',
      options: ['A', 'B'],
      state: 'waiting',
    };

    createPoll.mockResolvedValue(mockPoll);

    render(
      <BrowserRouter>
        <HostDashboard />
      </BrowserRouter>
    );

    // Create poll first
    const questionInput = screen.getByLabelText(/question/i);
    fireEvent.change(questionInput, { target: { value: 'Test question?' } });

    const optionInputs = screen.getAllByPlaceholderText(/option/i);
    fireEvent.change(optionInputs[0], { target: { value: 'A' } });
    fireEvent.change(optionInputs[1], { target: { value: 'B' } });

    const createButton = screen.getByText('Create Poll');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Open Voting')).toBeInTheDocument();
    });

    const openButton = screen.getByText('Open Voting');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(changePollState).toHaveBeenCalledWith('AB3K9T', 'open');
    });
  });
});

describe('Connection Status and Reconnection (User Story 3)', () => {
  it('should display connection status indicator', () => {
    Storage.prototype.getItem = jest.fn((key) => {
      const store = {
        poll: JSON.stringify({
          roomCode: 'AB3K9T',
          question: 'Test?',
          options: ['A', 'B'],
          state: 'open',
        }),
        nickname: 'Test',
        roomCode: 'AB3K9T',
        participantId: '99999',
      };
      return store[key];
    });

    render(
      <BrowserRouter>
        <VotePage />
      </BrowserRouter>
    );

    // Connection status indicator should be present
    expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
  });
});
