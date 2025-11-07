import React, { useState, useEffect } from 'react';
import { createPoll } from '../services/apiService';
import { changePollState, onPollStateChanged, onVoteUpdate, onParticipantJoined, onParticipantLeft, disconnect } from '../services/socketService';
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

  useEffect(() => {
    // Setup Socket.io event listeners
    const handleStateChange = (data) => {
      console.log('Poll state changed:', data);
      setPollState(data.newState);
    };

    const handleVoteUpdate = (data) => {
      console.log('Vote update received:', data);
      setVoteResults({
        counts: data.votes,
        percentages: data.percentages,
      });
    };

    const handleParticipantJoined = (data) => {
      console.log('Participant joined:', data);
      setParticipantCount((prev) => prev + 1);
    };

    const handleParticipantLeft = (data) => {
      console.log('Participant left:', data);
      setParticipantCount((prev) => Math.max(0, prev - 1));
    };

    onPollStateChanged(handleStateChange);
    onVoteUpdate(handleVoteUpdate);
    onParticipantJoined(handleParticipantJoined);
    onParticipantLeft(handleParticipantLeft);

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
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
    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      setError('At least 2 options must have text');
      return false;
    }
    for (const option of options) {
      if (option.trim().length > 0 && option.length > 100) {
        setError('Each option must be 100 characters or less');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filteredOptions = options.filter((opt) => opt.trim().length > 0);
      const response = await createPoll(question.trim(), filteredOptions);

      console.log('Poll created:', response);
      setPoll(response.poll);
      setPollState(response.poll.state);
      setVoteResults({
        counts: new Array(filteredOptions.length).fill(0),
        percentages: new Array(filteredOptions.length).fill(0),
      });
    } catch (err) {
      console.error('Failed to create poll:', err);
      setError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeState = async (newState) => {
    if (!poll) return;

    try {
      console.log(`Changing poll state to: ${newState}`);
      await changePollState(poll.roomCode, newState);
      // State will be updated via Socket.io event listener
    } catch (err) {
      console.error('Failed to change poll state:', err);
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
              <label htmlFor="question">Question:</label>
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                maxLength={500}
                required
              />
              <small>{question.length}/500 characters</small>
            </div>

            <div className="form-group">
              <label>Options:</label>
              {options.map((option, index) => (
                <div key={index} className="option-input">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={100}
                  />
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
