import React from 'react';
import './VoteConfirmation.css';

function VoteConfirmation() {
  return (
    <div className="vote-confirmation">
      <div className="confirmation-content">
        <div className="check-icon">✓</div>
        <p>Vote recorded!</p>
      </div>
    </div>
  );
}

export default VoteConfirmation;
