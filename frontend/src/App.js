import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Pages will be implemented in Phase 3+
// import HostDashboard from './pages/HostDashboard';
// import JoinPage from './pages/JoinPage';
// import VotePage from './pages/VotePage';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Zephyr Voting App</h1>
          <nav>
            <Link to="/">Home</Link> | <Link to="/host">Host Dashboard</Link> |{' '}
            <Link to="/join">Join Poll</Link>
          </nav>
        </header>

        <main className="App-main">
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <h2>Welcome to Zephyr Voting</h2>
                  <p>Real-time polling for small groups</p>
                  <div className="home-actions">
                    <Link to="/host" className="btn btn-primary">
                      Create Poll (Host)
                    </Link>
                    <Link to="/join" className="btn btn-secondary">
                      Join Poll (Participant)
                    </Link>
                  </div>
                </div>
              }
            />
            <Route path="/host" element={<div>Host Dashboard (Coming in Phase 3)</div>} />
            <Route path="/join" element={<div>Join Page (Coming in Phase 4)</div>} />
            <Route path="/vote" element={<div>Vote Page (Coming in Phase 4)</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
