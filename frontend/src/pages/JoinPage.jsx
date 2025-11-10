import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/socketService';
import './JoinPage.css';

function JoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    setError(null);

    if (!roomCode.trim()) {
      setError('Room code is required');
      return false;
    }

    if (roomCode.trim().length !== 6) {
      setError('Room code must be 6 characters');
      return false;
    }

    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/i.test(roomCode.trim())) {
      setError('Invalid room code format');
      return false;
    }

    if (!nickname.trim()) {
      setError('Nickname is required');
      return false;
    }

    if (nickname.trim().length < 1 || nickname.trim().length > 20) {
      setError('Nickname must be between 1 and 20 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const poll = await joinRoom(roomCode.trim().toUpperCase(), nickname.trim());

      // Store poll data and navigate to vote page
      sessionStorage.setItem('roomCode', poll.roomCode);
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('poll', JSON.stringify(poll));

      navigate(`/vote/${poll.roomCode}`);
    } catch (err) {
      setError(err.message || 'Failed to join room');
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <div className="join-container">
        <h1>Join Poll</h1>
        <p className="subtitle">Enter the room code to participate</p>

        <form onSubmit={handleSubmit} className="join-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="roomCode">Room Code</label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              disabled={loading}
              className="room-code-input"
              autoComplete="off"
            />
            <span className="input-hint">Enter the 6-character code from your host</span>
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Your Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              disabled={loading}
              autoComplete="off"
            />
            <span className="input-hint">This will be visible to everyone in the poll</span>
          </div>

          <button type="submit" disabled={loading} className="join-button">
            {loading ? 'Joining...' : 'Join Poll'}
          </button>
        </form>

        <div className="help-text">
          <p>Don't have a room code? Ask your host to share it with you.</p>
        </div>
      </div>
    </div>
  );
}

export default JoinPage;
