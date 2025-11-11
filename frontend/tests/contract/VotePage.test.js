/**
 * Contract tests for VotePage component
 *
 * These tests verify the VotePage component's contract with:
 * 1. Session storage handling
 * 2. Vote submission flow
 * 3. Socket event handling (poll state changes, vote updates)
 * 4. Connection status and reconnecting states
 * 5. Error handling and user feedback
 *
 * Goal: Achieve ≥80% code coverage for VotePage.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VotePage from '../../src/pages/VotePage';
import * as socketService from '../../src/services/socketService';

// Mock the socket service
jest.mock('../../src/services/socketService');

describe('VotePage - Session Storage Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    socketService.submitVote = jest.fn().mockResolvedValue({});
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  test('displays error when session data is missing', async () => {
    // No session storage data
    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    });
  });

  test('loads poll data from session storage', () => {
    const mockPoll = {
      roomCode: 'ABC123',
      question: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green'],
      state: 'open'
    };

    sessionStorage.setItem('poll', JSON.stringify(mockPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(mockPoll.question)).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });
});

describe('VotePage - Vote Submission', () => {
  const mockPoll = {
    roomCode: 'ABC123',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    state: 'open'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    sessionStorage.setItem('poll', JSON.stringify(mockPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    socketService.submitVote = jest.fn().mockResolvedValue({});
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  test('submits vote when option is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(socketService.submitVote).toHaveBeenCalledWith('ABC123', 'TestUser', 0);
    });
  });

  test('displays confirmation message after voting', async () => {
    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(screen.getByText(/vote recorded/i)).toBeInTheDocument();
    });
  });

  test('shows change vote button after voting', async () => {
    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change your vote/i })).toBeInTheDocument();
    });
  });

  test('allows changing vote', async () => {
    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Submit first vote
    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change your vote/i })).toBeInTheDocument();
    });

    // Change vote
    const changeButton = screen.getByRole('button', { name: /change your vote/i });
    fireEvent.click(changeButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /change your vote/i })).not.toBeInTheDocument();
    });

    // Submit new vote
    const blueButton = screen.getByRole('button', { name: /blue/i });
    fireEvent.click(blueButton);

    await waitFor(() => {
      expect(socketService.submitVote).toHaveBeenCalledWith('ABC123', 'TestUser', 1);
    });
  });

  test('handles vote submission error', async () => {
    socketService.submitVote.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test('prevents voting when poll state is not open', () => {
    const waitingPoll = { ...mockPoll, state: 'waiting' };
    sessionStorage.setItem('poll', JSON.stringify(waitingPoll));

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/waiting for host to open voting/i)).toBeInTheDocument();

    const redButton = screen.getByRole('button', { name: /red/i });
    expect(redButton).toBeDisabled();
  });
});

describe('VotePage - Socket Event Handlers', () => {
  const mockPoll = {
    roomCode: 'ABC123',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    state: 'open'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    sessionStorage.setItem('poll', JSON.stringify(mockPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    socketService.submitVote = jest.fn().mockResolvedValue({});
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  test('handles poll state changed to closed', async () => {
    let pollStateHandler;
    socketService.onPollStateChanged.mockImplementation(handler => {
      pollStateHandler = handler;
    });

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Simulate poll being closed
    await act(async () => {
      pollStateHandler({ newState: 'closed' });
    });

    await waitFor(() => {
      expect(screen.getByText(/voting has been closed/i)).toBeInTheDocument();
    });
  });

  test('handles vote update event', async () => {
    let voteUpdateHandler;
    socketService.onVoteUpdate.mockImplementation(handler => {
      voteUpdateHandler = handler;
    });

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Submit vote first to see results
    const redButton = screen.getByRole('button', { name: /red/i });
    fireEvent.click(redButton);

    await waitFor(() => {
      expect(socketService.submitVote).toHaveBeenCalled();
    });

    // Simulate vote update
    await act(async () => {
      voteUpdateHandler({
        votes: [5, 3, 2],
        percentages: [50, 30, 20]
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/5 votes/i)).toBeInTheDocument();
      expect(screen.getByText(/50%/i)).toBeInTheDocument();
    });
  });
});

describe('VotePage - Connection Status', () => {
  const mockPoll = {
    roomCode: 'ABC123',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    state: 'open'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    sessionStorage.setItem('poll', JSON.stringify(mockPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    socketService.submitVote = jest.fn().mockResolvedValue({});
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  test('displays connection status indicator', async () => {
    let connectionStatusHandler;
    socketService.onConnectionStatus.mockImplementation(handler => {
      connectionStatusHandler = handler;
    });

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should show connected by default
    expect(screen.getByText(/connected/i)).toBeInTheDocument();

    // Simulate disconnection
    await act(async () => {
      connectionStatusHandler({ status: 'disconnected' });
    });

    await waitFor(() => {
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });
  });

  test('displays reconnecting banner', async () => {
    let reconnectingHandler;
    socketService.onReconnecting.mockImplementation(handler => {
      reconnectingHandler = handler;
    });

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Simulate reconnecting
    await act(async () => {
      reconnectingHandler({ attempting: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/reconnecting to server/i)).toBeInTheDocument();
    });
  });

  test('clears reconnecting state when connected', async () => {
    let connectionStatusHandler;
    socketService.onConnectionStatus.mockImplementation(handler => {
      connectionStatusHandler = handler;
    });

    let reconnectingHandler;
    socketService.onReconnecting.mockImplementation(handler => {
      reconnectingHandler = handler;
    });

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Start reconnecting
    await act(async () => {
      reconnectingHandler({ attempting: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/reconnecting to server/i)).toBeInTheDocument();
    });

    // Connection restored
    await act(async () => {
      connectionStatusHandler({ status: 'connected' });
    });

    await waitFor(() => {
      expect(screen.queryByText(/reconnecting to server/i)).not.toBeInTheDocument();
    });
  });
});

describe('VotePage - Poll States', () => {
  const mockPoll = {
    roomCode: 'ABC123',
    question: 'What is your favorite color?',
    options: ['Red', 'Blue', 'Green'],
    state: 'waiting'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();

    socketService.submitVote = jest.fn().mockResolvedValue({});
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  test('displays waiting message when poll state is waiting', () => {
    sessionStorage.setItem('poll', JSON.stringify(mockPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/waiting for host to open voting/i)).toBeInTheDocument();
  });

  test('displays closed message when poll state is closed', () => {
    const closedPoll = { ...mockPoll, state: 'closed' };
    sessionStorage.setItem('poll', JSON.stringify(closedPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/voting has been closed/i)).toBeInTheDocument();
  });

  test('enables voting when poll state is open', () => {
    const openPoll = { ...mockPoll, state: 'open' };
    sessionStorage.setItem('poll', JSON.stringify(openPoll));
    sessionStorage.setItem('nickname', 'TestUser');
    sessionStorage.setItem('roomCode', 'ABC123');

    render(
      <MemoryRouter initialEntries={['/vote/ABC123']}>
        <Routes>
          <Route path="/vote/:roomCode" element={<VotePage />} />
        </Routes>
      </MemoryRouter>
    );

    const redButton = screen.getByRole('button', { name: /red/i });
    expect(redButton).not.toBeDisabled();
  });
});
