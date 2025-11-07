import React from 'react';
import './PollControls.css';

function PollControls({ pollState, onOpenPoll, onClosePoll }) {
  return (
    <div className="poll-controls">
      <h3>Poll Controls</h3>
      <div className="control-buttons">
        <button
          onClick={onOpenPoll}
          disabled={pollState === 'open' || pollState === 'closed'}
          className="btn-open"
        >
          {pollState === 'waiting' ? 'Open Voting' : 'Voting Open'}
        </button>
        <button
          onClick={onClosePoll}
          disabled={pollState === 'waiting' || pollState === 'closed'}
          className="btn-close"
        >
          {pollState === 'closed' ? 'Voting Closed' : 'Close Voting'}
        </button>
      </div>
      <div className="poll-status">
        Status: <span className={`status-${pollState}`}>{pollState.toUpperCase()}</span>
      </div>
    </div>
  );
}

export default PollControls;
