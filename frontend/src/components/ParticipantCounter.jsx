import React from 'react';
import PropTypes from 'prop-types';
import './ParticipantCounter.css';

function ParticipantCounter({ count }) {
  return (
    <div className="participant-counter">
      <span className="counter-icon">👥</span>
      <span className="counter-text">
        {count} participant{count !== 1 ? 's' : ''} connected
      </span>
    </div>
  );
}

ParticipantCounter.propTypes = {
  count: PropTypes.number.isRequired,
};

export default ParticipantCounter;
