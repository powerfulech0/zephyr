import React from 'react';
import './PollResults.css';

function PollResults({ options, counts, percentages, pollState }) {
  if (!options || options.length === 0) {
    return <div className="poll-results">No results yet</div>;
  }

  const maxCount = Math.max(...counts, 1);

  return (
    <div className="poll-results">
      <h3>Results {pollState === 'waiting' && '(Voting Not Started)'}</h3>
      <div className="results-container">
        {options.map((option, index) => {
          const count = counts[index] || 0;
          const percentage = percentages[index] || 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={index} className="result-item">
              <div className="result-label">
                <span className="option-text">{option}</span>
                <span className="vote-count">
                  {count} vote{count !== 1 ? 's' : ''} ({percentage}%)
                </span>
              </div>
              <div className="result-bar-container">
                <div
                  className="result-bar"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {pollState === 'open' && (
        <div className="results-note">Results update in real-time as votes come in</div>
      )}
    </div>
  );
}

export default PollResults;
