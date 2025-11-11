import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HostDashboard from '../../../src/pages/HostDashboard';
import * as apiService from '../../../src/services/apiService';
import * as socketService from '../../../src/services/socketService';

// Mock the services
jest.mock('../../../src/services/apiService');
jest.mock('../../../src/services/socketService');

describe('HostDashboard - Option Input Focus (US1)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock socket service methods
    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn();
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  // T004: Test focus maintenance on single character input
  test('T004 [US1]: maintains focus when typing a single character', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    // Find the first option input field
    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Click into the input to focus it
    await user.click(firstOptionInput);

    // Type a single character
    await user.keyboard('A');

    // Verify the input still has focus after typing one character
    expect(firstOptionInput).toHaveFocus();
    expect(firstOptionInput).toHaveValue('A');
  });

  // T005: Test focus maintenance on multiple consecutive characters (10+ chars)
  test('T005 [US1]: maintains focus when typing multiple consecutive characters', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    // Find the first option input field
    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Click into the input to focus it
    await user.click(firstOptionInput);

    // Type multiple characters (more than 10)
    const testText = 'Option One Text';
    await user.keyboard(testText);

    // Verify the input still has focus after typing multiple characters
    expect(firstOptionInput).toHaveFocus();
    expect(firstOptionInput).toHaveValue(testText);
  });

  // T006: Test cursor position preservation when editing existing text
  test('T006 [US1]: preserves cursor position when editing existing text', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    // Find the first option input field
    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Click into the input and type initial text
    await user.click(firstOptionInput);
    await user.keyboard('Hello World');

    // Move cursor to the middle (after "Hello ")
    firstOptionInput.setSelectionRange(6, 6);

    // Type a character in the middle
    await user.keyboard('Beautiful ');

    // Verify focus is maintained and text is correctly inserted
    expect(firstOptionInput).toHaveFocus();
    expect(firstOptionInput).toHaveValue('Hello Beautiful World');
  });
});

describe('HostDashboard - Multi-Field Workflow (US2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn();
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  // T013: Test Tab navigation between option fields
  test('T013 [US2]: allows Tab navigation between option fields', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');
    const secondOptionInput = screen.getByPlaceholderText('Option 2');

    // Click into first input and type
    await user.click(firstOptionInput);
    await user.keyboard('Red');
    expect(firstOptionInput).toHaveFocus();

    // Press Tab to move to next field
    await user.keyboard('{Tab}');

    // Verify focus moved to second field
    await waitFor(() => {
      expect(secondOptionInput).toHaveFocus();
    });

    // Type in second field
    await user.keyboard('Blue');
    expect(secondOptionInput).toHaveValue('Blue');
  });

  // T014: Test rapid sequential typing across multiple fields
  test('T014 [US2]: maintains focus during rapid sequential typing across fields', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');
    const secondOptionInput = screen.getByPlaceholderText('Option 2');

    // Rapidly type in first field
    await user.click(firstOptionInput);
    await user.keyboard('Red');
    expect(firstOptionInput).toHaveValue('Red');
    expect(firstOptionInput).toHaveFocus();

    // Click into second field and rapidly type
    await user.click(secondOptionInput);
    await user.keyboard('Blue');
    expect(secondOptionInput).toHaveValue('Blue');
    expect(secondOptionInput).toHaveFocus();
  });

  // T015: Test keyboard shortcuts maintaining focus
  test('T015 [US2]: maintains focus when using keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Type initial text
    await user.click(firstOptionInput);
    await user.keyboard('Option One');

    // Select all with Ctrl+A
    await user.keyboard('{Control>}a{/Control}');
    expect(firstOptionInput).toHaveFocus();

    // Copy with Ctrl+C (focus should remain)
    await user.keyboard('{Control>}c{/Control}');
    expect(firstOptionInput).toHaveFocus();

    // Paste with Ctrl+V (focus should remain)
    await user.keyboard('{Control>}v{/Control}');
    expect(firstOptionInput).toHaveFocus();
  });
});

describe('HostDashboard - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    socketService.joinSocketRoom = jest.fn();
    socketService.changePollState = jest.fn();
    socketService.onPollStateChanged = jest.fn();
    socketService.onVoteUpdate = jest.fn();
    socketService.onParticipantJoined = jest.fn();
    socketService.onParticipantLeft = jest.fn();
    socketService.onConnectionStatus = jest.fn();
    socketService.onReconnecting = jest.fn();
  });

  // T020: Test paste maintaining focus
  test('T020: maintains focus when pasting text', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Click and focus
    await user.click(firstOptionInput);

    // Simulate paste event
    await user.paste('Pasted Option Text');

    // Verify focus maintained
    expect(firstOptionInput).toHaveFocus();
    expect(firstOptionInput).toHaveValue('Pasted Option Text');
  });

  // T021: Test special characters and emoji
  test('T021: maintains focus with special characters and emoji', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    await user.click(firstOptionInput);

    // Type special characters and emoji
    const specialText = 'Option! @#$ 🎉 Test';
    await user.keyboard(specialText);

    expect(firstOptionInput).toHaveFocus();
    expect(firstOptionInput.value).toBe(specialText);
  });

  // T022: Test adding new option field doesn't affect existing keys
  test('T022: adding new option field does not affect existing field keys', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    const firstOptionInput = screen.getByPlaceholderText('Option 1');

    // Type in first field
    await user.click(firstOptionInput);
    await user.keyboard('First Option');

    // Add a new option by clicking "Add Option" button
    const addButton = screen.getByText('Add Option');
    await user.click(addButton);

    // Verify original field still has correct value
    expect(firstOptionInput).toHaveValue('First Option');

    // Verify new field exists
    const thirdOptionInput = screen.getByPlaceholderText('Option 3');
    expect(thirdOptionInput).toBeInTheDocument();
  });

  // T023: Test removing option field re-indexes correctly
  test('T023: removing option field re-indexes correctly', async () => {
    const user = userEvent.setup();
    render(<HostDashboard />);

    // Add a third option first
    const addButton = screen.getByText('Add Option');
    await user.click(addButton);

    // Type in all three fields
    const firstOptionInput = screen.getByPlaceholderText('Option 1');
    const secondOptionInput = screen.getByPlaceholderText('Option 2');
    const thirdOptionInput = screen.getByPlaceholderText('Option 3');

    await user.click(firstOptionInput);
    await user.keyboard('First');

    await user.click(secondOptionInput);
    await user.keyboard('Second');

    await user.click(thirdOptionInput);
    await user.keyboard('Third');

    // Remove the second option
    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[1]); // Remove second option

    // Verify remaining options still have correct values
    expect(firstOptionInput).toHaveValue('First');

    // After removal, verify we have 2 option inputs remaining (started with 2, added 1, removed 1 = 2)
    const optionInputs = screen.getAllByPlaceholderText(/^Option \d+$/);
    expect(optionInputs).toHaveLength(2); // 2 remaining option fields
  });
});
