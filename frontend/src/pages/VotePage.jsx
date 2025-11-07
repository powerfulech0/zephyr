import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  submitVote,
  onPollStateChanged,
  onVoteUpdate,
  disconnect,
} from '../services/socketService';
import VoteConfirmation from '../components/VoteConfirmation';
import './VotePage.css';

function VotePage() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollState, setPollState] = useState('waiting');
  const [voteResults, setVoteResults] = useState({ votes: [], percentages: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    // Load data from sessionStorage
    const storedPoll = sessionStorage.getItem('poll');
    const storedNickname = sessionStorage.getItem('nickname');
    const storedRoomCode = sessionStorage.getItem('roomCode');

    if (!storedPoll || !storedNickname || !storedRoomCode) {
      setError('Session expired. Please join again.');
      setTimeout(() => navigate('/join'), 2000);
      return;
    }

    const pollData = JSON.parse(storedPoll);
    setPoll(pollData);
    setNickname(storedNickname);
    setRoomCode(storedRoomCode);
    setPollState(pollData.state);

    // Initialize vote results array
    setVoteResults({
      votes: new Array(pollData.options.length).fill(0),
      percentages: new Array(pollData.options.length).fill(0),
    });

    // Setup Socket.io listeners
    onPollStateChanged(data => {
      setPollState(data.newState);
      if (data.newState === 'closed') {
        setError('Voting has been closed by the host');
      }
    });

    onVoteUpdate(data => {
      setVoteResults({
        votes: data.votes || [],
        percentages: data.percentages || [],
      });
    });

    // Cleanup on unmount
    // eslint-disable-next-line consistent-return
    return () => {
      disconnect();
    };
  }, [navigate, urlRoomCode]);

  const handleVoteSubmit = async optionIndex => {
    if (loading || pollState !== 'open') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitVote(roomCode, nickname, optionIndex);
      setSelectedOption(optionIndex);
      setHasVoted(true);
      setShowConfirmation(true);

      // Hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVote = () => {
    setHasVoted(false);
    setSelectedOption(null);
  };

  if (error && !poll) {
    return (
      <div className="vote-page">
        <div className="vote-container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="vote-page">
        <div className="vote-container">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-page">
      <div className="vote-container">
        <div className="vote-header">
          <div className="room-info">
            <span className="room-label">Room Code:</span>
            <span className="room-code">{roomCode}</span>
          </div>
          <div className="participant-info">
            <span className="participant-name">{nickname}</span>
          </div>
        </div>

        <div className="poll-question">
          <h2>{poll.question}</h2>
        </div>

        {pollState === 'waiting' && (
          <div className="status-message waiting">
            <p>⏳ Waiting for host to open voting...</p>
          </div>
        )}

        {pollState === 'closed' && (
          <div className="status-message closed">
            <p>🔒 Voting has been closed</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="options-container">
          {poll.options.map((option, index) => {
            const voteCount = voteResults.votes[index] || 0;
            const percentage = voteResults.percentages[index] || 0;
            const isSelected = selectedOption === index;
            const isDisabled = pollState !== 'open' || loading;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleVoteSubmit(index)}
                disabled={isDisabled}
                className={`option-button ${isSelected ? 'selected' : ''} ${
                  isDisabled ? 'disabled' : ''
                }`}
              >
                <div className="option-content">
                  <span className="option-text">{option}</span>
                  {hasVoted && (
                    <span className="vote-stats">
                      {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage}%)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {hasVoted && pollState === 'open' && (
          <button
            type="button"
            onClick={handleChangeVote}
            className="change-vote-button"
          >
            Change Your Vote
          </button>
        )}

        {showConfirmation && <VoteConfirmation />}
      </div>
    </div>
  );
}

export default VotePage;
