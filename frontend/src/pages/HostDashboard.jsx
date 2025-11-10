import React, { useState, useEffect } from 'react';
import { createPoll } from '../services/apiService';
import {
  joinSocketRoom,
  changePollState,
  onPollStateChanged,
  onVoteUpdate,
  onParticipantJoined,
  onParticipantLeft,
  onConnectionStatus,
  onReconnecting,
} from '../services/socketService';
import PollControls from '../components/PollControls';
import PollResults from '../components/PollResults';
import ParticipantCounter from '../components/ParticipantCounter';
import './HostDashboard.css';

function HostDashboard() {
  // Form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Poll state
  const [poll, setPoll] = useState(null);
  const [pollState, setPollState] = useState('waiting');
  const [participantCount, setParticipantCount] = useState(0);
  const [voteResults, setVoteResults] = useState({ counts: [], percentages: [] });
  const [isReconnecting, setIsReconnecting] = useState(false); // T091
  const [connectionStatus, setConnectionStatus] = useState('connected'); // T092

  useEffect(() => {
    // Setup Socket.io event listeners
    const handleStateChange = data => {
      setPollState(data.newState);
    };

    const handleVoteUpdate = data => {
      setVoteResults({
        counts: data.votes,
        percentages: data.percentages,
      });
    };

    const handleParticipantJoined = () => {
      setParticipantCount(prev => prev + 1);
    };

    const handleParticipantLeft = () => {
      setParticipantCount(prev => Math.max(0, prev - 1));
    };

    onPollStateChanged(handleStateChange);
    onVoteUpdate(handleVoteUpdate);
    onParticipantJoined(handleParticipantJoined);
    onParticipantLeft(handleParticipantLeft);

    // Connection status listener (T092)
    onConnectionStatus(status => {
      setConnectionStatus(status.status);
      if (status.status === 'connected') {
        setIsReconnecting(false);
      }
    });

    // Reconnecting listener (T091)
    onReconnecting(data => {
      setIsReconnecting(data.attempting);
    });

    // Cleanup on unmount - DO NOT disconnect socket (it's a singleton)
    return () => {
      // Socket should persist across components, so no disconnect here
    };
  }, []);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = index => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!question.trim()) {
      setError('Question is required');
      return false;
    }
    if (question.length > 500) {
      setError('Question must be 500 characters or less');
      return false;
    }
    if (options.length < 2 || options.length > 5) {
      setError('You must have between 2 and 5 options');
      return false;
    }
    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError('At least 2 options must have text');
      return false;
    }
    const hasLongOption = options.some(option => option.trim().length > 0 && option.length > 100);
    if (hasLongOption) {
      setError('Each option must be 100 characters or less');
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreatePoll = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filteredOptions = options.filter(opt => opt.trim().length > 0);
      const response = await createPoll(question.trim(), filteredOptions);

      setPoll(response);
      setPollState(response.state);
      setVoteResults({
        counts: new Array(filteredOptions.length).fill(0),
        percentages: new Array(filteredOptions.length).fill(0),
      });

      // Join the Socket.io room to receive state change broadcasts
      joinSocketRoom(response.roomCode);
    } catch (err) {
      setError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeState = async newState => {
    if (!poll) return;

    try {
      await changePollState(poll.roomCode, newState);
      // State will be updated via Socket.io event listener
    } catch (err) {
      setError(err.message || 'Failed to change poll state');
    }
  };

  if (!poll) {
    return (
      <div className="host-dashboard">
        <div className="create-poll-section">
          <h2>Create a New Poll</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleCreatePoll}>
            <div className="form-group">
              <label htmlFor="poll-question">
                Question:
                <input
                  type="text"
                  id="poll-question"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="What would you like to ask?"
                  maxLength={500}
                />
              </label>
              <small>{question.length}/500 characters</small>
            </div>

            <div className="form-group">
              <fieldset>
                <legend>Options:</legend>
                {options.map((option, index) => (
                  <div key={option || `empty-option-${index}`} className="option-input">
                    <label htmlFor={`poll-option-${index}`}>
                      Option {index + 1}
                      <input
                        type="text"
                        id={`poll-option-${index}`}
                        value={option}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        maxLength={100}
                      />
                    </label>
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 5 && (
                  <button type="button" onClick={handleAddOption} className="btn-add">
                    Add Option
                  </button>
                )}
              </fieldset>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Poll'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="host-dashboard">
      {/* Connection Status Indicator (T092) */}
      <div className={`connection-status ${connectionStatus}`}>
        {connectionStatus === 'connected' && '🟢 Connected'}
        {connectionStatus === 'disconnected' && '🔴 Disconnected'}
        {connectionStatus === 'failed' && '⚠️ Connection Failed'}
      </div>

      {/* Reconnecting UI State (T091) */}
      {isReconnecting && (
        <div className="reconnecting-banner">
          <span className="reconnecting-spinner">⟳</span>
          Reconnecting to server...
        </div>
      )}

      <div className="poll-header">
        <h2>{poll.question}</h2>
        <div className="room-code">
          Room Code: <strong>{poll.roomCode}</strong>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <ParticipantCounter count={participantCount} />

      <PollControls
        pollState={pollState}
        onOpenPoll={() => handleChangeState('open')}
        onClosePoll={() => handleChangeState('closed')}
      />

      <PollResults
        options={poll.options}
        counts={voteResults.counts}
        percentages={voteResults.percentages}
        pollState={pollState}
      />
    </div>
  );
}

export default HostDashboard;
