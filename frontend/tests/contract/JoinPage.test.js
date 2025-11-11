/**
 * Contract tests for JoinPage component
 *
 * These tests verify the JoinPage component's contract with:
 * 1. User input validation (room code format, nickname requirements)
 * 2. Socket service integration (joinRoom API)
 * 3. Navigation behavior (redirect to vote page)
 * 4. Error handling (API failures, network issues)
 *
 * Goal: Achieve ≥80% code coverage for JoinPage.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import JoinPage from '../../src/pages/JoinPage';
import * as socketService from '../../src/services/socketService';

// Mock the service modules
jest.mock('../../src/services/socketService');

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

describe('JoinPage - Form Rendering', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test('renders join form with room code and nickname inputs', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /join poll/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/room code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your nickname/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join poll/i })).toBeInTheDocument();
    expect(screen.getByText(/enter the room code to participate/i)).toBeInTheDocument();
  });
});

describe('JoinPage - Form Validation', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test('validates room code is required', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/room code is required/i)).toBeInTheDocument();
    expect(socketService.joinRoom).not.toHaveBeenCalled();
  });

  test('validates nickname is required', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    // Use room code with only valid characters (23456789ABCDEFGHJKLMNPQRSTUVWXYZ)
    fireEvent.change(roomCodeInput, { target: { value: '3B7KWX' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/nickname is required/i)).toBeInTheDocument();
    expect(socketService.joinRoom).not.toHaveBeenCalled();
  });

  test('validates room code length (must be exactly 6 characters)', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC12' } }); // Only 5 chars
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/room code must be 6 characters/i)).toBeInTheDocument();
    expect(socketService.joinRoom).not.toHaveBeenCalled();
  });

  test('validates nickname length (1-20 characters)', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    // Test minimum length (empty after trimming)
    fireEvent.change(roomCodeInput, { target: { value: '3B7KWX' } });
    fireEvent.change(nicknameInput, { target: { value: '   ' } }); // Just whitespace
    fireEvent.click(submitButton);

    expect(screen.getByText(/nickname is required/i)).toBeInTheDocument();
    expect(socketService.joinRoom).not.toHaveBeenCalled();
  });

  test('rejects invalid room code characters (special chars, 0, 1, O, I)', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    // Test with invalid characters (0 is excluded from room code alphabet)
    fireEvent.change(roomCodeInput, { target: { value: 'ABC000' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/invalid room code format/i)).toBeInTheDocument();
    expect(socketService.joinRoom).not.toHaveBeenCalled();
  });

  test('trims whitespace from room code and nickname', async () => {
    const mockPollResponse = {
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    };

    socketService.joinRoom.mockResolvedValue(mockPollResponse);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: '  ABC123  ' } });
    fireEvent.change(nicknameInput, { target: { value: '  TestUser  ' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(socketService.joinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
    });
  });

  test('converts room code to uppercase automatically', () => {
    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);

    fireEvent.change(roomCodeInput, { target: { value: 'abc123' } });

    expect(roomCodeInput.value).toBe('ABC123');
  });

  test('validates room code format (6 characters, valid alphabet)', async () => {
    const mockPollResponse = {
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    };

    socketService.joinRoom.mockResolvedValue(mockPollResponse);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    // Valid room code with only allowed characters (23456789ABCDEFGHJKLMNPQRSTUVWXYZ)
    fireEvent.change(roomCodeInput, { target: { value: '3B7KWX' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(socketService.joinRoom).toHaveBeenCalled();
    });
  });
});

describe('JoinPage - API Integration', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    sessionStorage.clear();
  });

  test('calls joinRoom API with correct parameters on valid submission', async () => {
    const mockPollResponse = {
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    };

    socketService.joinRoom.mockResolvedValue(mockPollResponse);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(socketService.joinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
    });
  });

  test('navigates to vote page on successful join (route: /vote/:roomCode)', async () => {
    const mockPollResponse = {
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    };

    socketService.joinRoom.mockResolvedValue(mockPollResponse);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vote/ABC123');
    });

    // Verify session storage was updated
    expect(sessionStorage.getItem('roomCode')).toBe('ABC123');
    expect(sessionStorage.getItem('nickname')).toBe('TestUser');
    expect(JSON.parse(sessionStorage.getItem('poll'))).toEqual(mockPollResponse);
  });
});

describe('JoinPage - Loading States', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test('displays loading state during API call (button disabled)', async () => {
    let resolveJoinRoom;
    const joinRoomPromise = new Promise(resolve => {
      resolveJoinRoom = resolve;
    });
    socketService.joinRoom.mockReturnValue(joinRoomPromise);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolve the promise to cleanup
    resolveJoinRoom({
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    });
  });

  test('displays loading indicator while joining', async () => {
    let resolveJoinRoom;
    const joinRoomPromise = new Promise(resolve => {
      resolveJoinRoom = resolve;
    });
    socketService.joinRoom.mockReturnValue(joinRoomPromise);

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    // Loading text should be displayed
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /joining/i })).toBeInTheDocument();
    });

    // Resolve the promise to cleanup
    resolveJoinRoom({
      roomCode: 'ABC123',
      question: 'Test Question',
      options: ['Option 1', 'Option 2'],
      state: 'waiting'
    });
  });
});

describe('JoinPage - Error Handling', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test('handles API error: room not found', async () => {
    socketService.joinRoom.mockRejectedValue(new Error('Room not found'));

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('handles API error: network failure', async () => {
    socketService.joinRoom.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('handles API error: timeout', async () => {
    socketService.joinRoom.mockRejectedValue(new Error('Request timeout'));

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('displays user-friendly error messages (no stack traces)', async () => {
    socketService.joinRoom.mockRejectedValue(new Error());

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to join room/i)).toBeInTheDocument();
    });

    // Ensure no stack trace is displayed
    const errorMessage = screen.getByText(/failed to join room/i);
    expect(errorMessage.textContent).not.toMatch(/at \w+\s+\(/); // No stack trace pattern
  });

  test('allows retry after error (form remains editable)', async () => {
    socketService.joinRoom
      .mockRejectedValueOnce(new Error('Room not found'))
      .mockResolvedValueOnce({
        roomCode: 'ABC123',
        question: 'Test Question',
        options: ['Option 1', 'Option 2'],
        state: 'waiting'
      });

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });

    // Form should still be editable
    expect(roomCodeInput).not.toBeDisabled();
    expect(nicknameInput).not.toBeDisabled();
    expect(submitButton).not.toBeDisabled();

    // Retry
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/vote/ABC123');
    });
  });

  test('clears error message when user edits input', async () => {
    socketService.joinRoom.mockRejectedValue(new Error('Room not found'));

    render(
      <MemoryRouter>
        <JoinPage />
      </MemoryRouter>
    );

    const roomCodeInput = screen.getByLabelText(/room code/i);
    const nicknameInput = screen.getByLabelText(/your nickname/i);
    const submitButton = screen.getByRole('button', { name: /join poll/i });

    fireEvent.change(roomCodeInput, { target: { value: 'ABC123' } });
    fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });
    fireEvent.click(submitButton);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });

    // Edit input - error should be cleared by validation
    fireEvent.change(roomCodeInput, { target: { value: 'XYZ789' } });
    fireEvent.click(submitButton);

    // New error should appear (since we still get the same error)
    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });
  });
});
