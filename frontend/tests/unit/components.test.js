/**
 * Frontend Component Unit Tests (T095)
 *
 * Tests individual component rendering and behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PollResults from '../../src/components/PollResults';
import ParticipantCounter from '../../src/components/ParticipantCounter';
import PollControls from '../../src/components/PollControls';
import VoteConfirmation from '../../src/components/VoteConfirmation';

describe('PollResults Component', () => {
  it('should render "No results yet" when no options provided', () => {
    render(<PollResults options={[]} counts={[]} percentages={[]} pollState="waiting" />);
    expect(screen.getByText('No results yet')).toBeInTheDocument();
  });

  it('should render all options with vote counts', () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const counts = [5, 3, 2];
    const percentages = [50, 30, 20];

    render(
      <PollResults options={options} counts={counts} percentages={percentages} pollState="open" />
    );

    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
    expect(screen.getByText('5 votes (50%)')).toBeInTheDocument();
    expect(screen.getByText('3 votes (30%)')).toBeInTheDocument();
    expect(screen.getByText('2 votes (20%)')).toBeInTheDocument();
  });

  it('should show waiting message when poll state is waiting', () => {
    const options = ['Option A'];
    render(<PollResults options={options} counts={[0]} percentages={[0]} pollState="waiting" />);
    expect(screen.getByText('Results (Voting Not Started)')).toBeInTheDocument();
  });

  it('should show real-time update note when poll is open', () => {
    const options = ['Option A'];
    render(<PollResults options={options} counts={[0]} percentages={[0]} pollState="open" />);
    expect(screen.getByText('Results update in real-time as votes come in')).toBeInTheDocument();
  });
});

describe('ParticipantCounter Component', () => {
  it('should display singular "participant" for count of 1', () => {
    render(<ParticipantCounter count={1} />);
    expect(screen.getByText('1 participant connected')).toBeInTheDocument();
  });

  it('should display plural "participants" for count > 1', () => {
    render(<ParticipantCounter count={5} />);
    expect(screen.getByText('5 participants connected')).toBeInTheDocument();
  });

  it('should display plural for count of 0', () => {
    render(<ParticipantCounter count={0} />);
    expect(screen.getByText('0 participants connected')).toBeInTheDocument();
  });

  it('should display the participant icon', () => {
    const { container } = render(<ParticipantCounter count={3} />);
    expect(container.querySelector('.counter-icon')).toHaveTextContent('👥');
  });
});

describe('PollControls Component', () => {
  it('should show "Open Voting" button when poll is waiting', () => {
    const mockOpen = jest.fn();
    const mockClose = jest.fn();
    render(<PollControls pollState="waiting" onOpenPoll={mockOpen} onClosePoll={mockClose} />);

    const button = screen.getByText('Open Voting');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should show "Close Voting" button when poll is open', () => {
    const mockOpen = jest.fn();
    const mockClose = jest.fn();
    render(<PollControls pollState="open" onOpenPoll={mockOpen} onClosePoll={mockClose} />);

    const button = screen.getByText('Close Voting');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should show disabled button when poll is closed', () => {
    const mockOpen = jest.fn();
    const mockClose = jest.fn();
    render(<PollControls pollState="closed" onOpenPoll={mockOpen} onClosePoll={mockClose} />);

    const button = screen.getByText('Voting Closed');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});

describe('VoteConfirmation Component', () => {
  it('should render confirmation message', () => {
    render(<VoteConfirmation />);
    expect(screen.getByText(/vote recorded/i)).toBeInTheDocument();
  });

  it('should have confirmation styling class', () => {
    const { container } = render(<VoteConfirmation />);
    expect(container.querySelector('.vote-confirmation')).toBeInTheDocument();
  });
});
