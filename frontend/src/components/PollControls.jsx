import React from 'react';
import PropTypes from 'prop-types';
import './PollControls.css';

function PollControls({ pollState, onOpenPoll, onClosePoll }) {
  // Determine button text and handler based on poll state
  const getButtonConfig = () => {
    switch (pollState) {
      case 'waiting':
        return { text: 'Open Voting', onClick: onOpenPoll, disabled: false, className: 'btn-open' };
      case 'open':
        return {
          text: 'Close Voting',
          onClick: onClosePoll,
          disabled: false,
          className: 'btn-close',
        };
      case 'closed':
        return { text: 'Voting Closed', onClick: null, disabled: true, className: 'btn-closed' };
      default:
        return { text: 'Open Voting', onClick: onOpenPoll, disabled: false, className: 'btn-open' };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="poll-controls">
      <h3>Poll Controls</h3>
      <div className="control-buttons">
        <button
          type="button"
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled}
          className={buttonConfig.className}
        >
          {buttonConfig.text}
        </button>
      </div>
      <div className="poll-status">
        Status:{' '}
        <span className={`status-${pollState}`}>
          {pollState?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
    </div>
  );
}

PollControls.propTypes = {
  pollState: PropTypes.string.isRequired,
  onOpenPoll: PropTypes.func.isRequired,
  onClosePoll: PropTypes.func.isRequired,
};

export default PollControls;
