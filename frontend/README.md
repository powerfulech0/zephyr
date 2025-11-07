# Zephyr Voting App - Frontend

React-based real-time voting frontend with WebSocket connectivity for live polling and instant result updates.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📋 Prerequisites

- Node.js 18+ (LTS)
- npm 9+
- Backend server running on http://localhost:4000

## 🏗️ Architecture

### Technology Stack

- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router DOM 7.9.5
- **WebSocket**: Socket.io Client 4.8.1
- **Charts**: Chart.js 4.5.1 + react-chartjs-2
- **HTTP Client**: Fetch API (native)
- **Styling**: CSS (vanilla)

### Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── HostDashboard.jsx        # Host poll creation & control
│   │   ├── HostDashboard.css        # Host dashboard styles
│   │   ├── JoinPage.jsx             # Participant join page
│   │   ├── JoinPage.css             # Join page styles
│   │   ├── VotePage.jsx             # Participant voting interface
│   │   └── VotePage.css             # Vote page styles
│   ├── components/
│   │   ├── PollControls.jsx         # Open/close voting controls
│   │   ├── PollControls.css         # Poll controls styles
│   │   ├── PollResults.jsx          # Live vote results display
│   │   ├── PollResults.css          # Results styles
│   │   └── ParticipantCounter.jsx   # Participant count display
│   ├── services/
│   │   ├── apiService.js            # REST API client
│   │   └── socketService.js         # Socket.io client & event handlers
│   ├── utils/
│   │   └── roomCodeFormatter.js     # Room code formatting utilities
│   ├── App.jsx                      # Main app component & routing
│   ├── App.css                      # Global app styles
│   ├── main.jsx                     # React entry point
│   └── index.css                    # Global CSS reset & base styles
├── tests/
│   ├── unit/                        # Component unit tests
│   └── integration/                 # User flow tests
├── public/                          # Static assets
├── .env                             # Environment variables
├── vite.config.js                   # Vite configuration
└── package.json                     # Dependencies and scripts
```

## 🛣️ Routes

### Application Routes

- **`/`** - Host Dashboard (Create Poll)
- **`/join`** - Participant Join Page
- **`/vote`** - Participant Voting Page

### Navigation Flow

```
Host Flow:
  / (HostDashboard) → Create Poll → Display Room Code & Controls

Participant Flow:
  /join (JoinPage) → Enter Code + Nickname → /vote (VotePage)
```

## 🧩 Components

### Pages

#### HostDashboard
**Purpose**: Poll creation and host controls

**Features:**
- Create poll with question and 2-5 options
- Display room code prominently
- Open/close voting controls
- Live participant count
- Real-time vote results with charts
- Connection status indicator

**Props**: None (stateful page)

**State:**
- Poll creation form (question, options)
- Created poll data (roomCode, state, options)
- Live vote results (counts, percentages)
- Participant count
- Connection status
- Reconnection status

#### JoinPage
**Purpose**: Participant entry point

**Features:**
- Room code input (6 characters)
- Nickname input (unique per room)
- Form validation
- Error message display
- Redirects to VotePage on successful join

**Props**: None (stateful page)

**State:**
- Form inputs (roomCode, nickname)
- Loading state
- Error messages

#### VotePage
**Purpose**: Participant voting interface

**Features:**
- Display poll question and options
- Vote submission (radio buttons or clickable cards)
- Vote change functionality
- Instant vote confirmation
- Poll state awareness (waiting/open/closed)
- Connection status indicator
- Reconnecting banner

**Props**: None (uses sessionStorage for persistence)

**State:**
- Poll data (from join or sessionStorage)
- Selected option
- Vote submitted status
- Connection status
- Reconnecting status

### Components

#### PollControls
**Purpose**: Host controls for poll state management

**Props:**
```javascript
{
  pollState: String,        // 'waiting' | 'open' | 'closed'
  onOpenPoll: Function,     // Handler for opening voting
  onClosePoll: Function     // Handler for closing voting
}
```

**Features:**
- "Open Voting" button (disabled when open/closed)
- "Close Voting" button (disabled when waiting/closed)
- Current poll state display

#### PollResults
**Purpose**: Live vote visualization

**Props:**
```javascript
{
  options: Array<String>,      // Poll options
  counts: Array<Number>,       // Vote counts per option
  percentages: Array<Number>,  // Vote percentages
  pollState: String            // Current poll state
}
```

**Features:**
- Bar chart visualization (Chart.js)
- Vote counts and percentages
- Responsive layout
- Updates in real-time

#### ParticipantCounter
**Purpose**: Display connected participant count

**Props:**
```javascript
{
  count: Number  // Number of connected participants
}
```

**Features:**
- Simple numeric display
- Icon/emoji indicator
- Updates in real-time

## 🔌 Services

### apiService.js

REST API client for backend communication.

**Methods:**

```javascript
// Create a new poll
createPoll(question, options)
// Returns: { success: true, poll: {...} }

// Get poll by room code
getPoll(roomCode)
// Returns: { success: true, poll: {...} }
```

**Configuration:**
- Base URL: `import.meta.env.VITE_API_URL` (default: http://localhost:4000)
- Uses native Fetch API
- Handles errors and returns structured responses

### socketService.js

Socket.io client and event management.

**Connection:**

```javascript
// Auto-connects on import
import socket from './socketService';

// Check connection status
getConnectionStatus()
// Returns: Boolean
```

**Client → Server Events:**

```javascript
// Join room (host - simple)
joinSocketRoom(roomCode)

// Join room (participant - with tracking)
joinRoom(roomCode, nickname)
// Returns: Promise<poll>

// Submit vote
submitVote(roomCode, nickname, optionIndex)
// Returns: Promise<void>

// Change poll state
changePollState(roomCode, newState)
// Returns: Promise<state>
```

**Server → Client Event Listeners:**

```javascript
// Participant joined
onParticipantJoined(callback)
// callback: (data) => { nickname, count, timestamp }

// Participant left
onParticipantLeft(callback)
// callback: (data) => { nickname, count, timestamp }

// Vote update
onVoteUpdate(callback)
// callback: (data) => { votes, percentages }

// Poll state changed
onPollStateChanged(callback)
// callback: (data) => { newState, previousState, timestamp }

// Connection status
onConnectionStatus(callback)
// callback: (status) => { status: 'connected'|'disconnected'|'failed', socketId }

// Reconnecting
onReconnecting(callback)
// callback: (data) => { attempting: true, attemptNumber }
```

**Cleanup:**

```javascript
// Remove event listener
offParticipantJoined(callback)
offParticipantLeft(callback)
offVoteUpdate(callback)
offPollStateChanged(callback)

// Disconnect socket
disconnect()
```

**Auto-Reconnection Features:**
- Automatic reconnection with exponential backoff
- Max 5 reconnection attempts
- Auto-rejoin room on reconnect (uses sessionStorage)
- Reconnecting UI indicator

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000
```

**Variables:**
- `VITE_API_URL`: Backend API URL (default: http://localhost:4000)

**Note**: Vite requires `VITE_` prefix for environment variables to be exposed to the browser.

### Vite Configuration

See `vite.config.js` for:
- React plugin configuration
- Build settings
- Dev server port (default: 3000)
- Proxy settings (if needed)

## 🎨 Styling

### CSS Architecture

- **Global Styles**: `index.css` - CSS reset and base styles
- **App Styles**: `App.css` - App-level layout and routing
- **Component Styles**: Co-located with components (e.g., `HostDashboard.css`)

### Design System

**Colors:**
- Primary: #4a90e2 (Blue)
- Success: #27ae60 (Green)
- Danger: #e74c3c (Red)
- Warning: #f39c12 (Orange)
- Neutral: Grays

**Typography:**
- Base font: System font stack
- Monospace: 'Courier New' (for room codes)

**Key UI Patterns:**
- **Room Code Display**: Large, white text on semi-transparent blue background
- **Connection Status**: Color-coded indicators (🟢 green, 🔴 red)
- **Reconnecting Banner**: Yellow banner with spinner
- **Poll Controls**: Large, clearly labeled buttons with disabled states
- **Vote Options**: Clickable cards or radio buttons

### Responsive Design

- **Desktop-first**: Optimized for presentation screens
- **Mobile-friendly**: Works on tablets and phones
- **Min width**: 320px

## 🔄 Real-Time Features

### WebSocket Connection

**Lifecycle:**
1. Auto-connect on app load
2. Join room after poll creation (host) or successful join (participant)
3. Receive real-time updates
4. Auto-reconnect on connection loss
5. Auto-rejoin room on reconnect

**Connection Status:**
- **Connected**: 🟢 Green indicator
- **Disconnected**: 🔴 Red indicator
- **Reconnecting**: ⟳ Spinner with banner

### Auto-Reconnection

When connection is lost:
1. Socket.io attempts automatic reconnection (max 5 attempts)
2. "Reconnecting..." banner appears
3. On successful reconnect, automatically rejoins room
4. Room code and nickname restored from sessionStorage
5. Poll state and votes sync immediately

### SessionStorage Persistence

Stored data for reconnection:
- `roomCode`: Current room code
- `nickname`: Participant nickname
- Auto-cleared on disconnect

## 🧪 Testing

### Test Structure

```bash
# Run unit tests (not configured yet)
npm test
```

**Note**: Unit testing framework is not yet configured for the frontend. See [Backend README](../backend/README.md) for comprehensive backend testing (95.53% coverage).

## 🐛 Debugging

### Development Tools

**React DevTools:**
- Install browser extension
- Inspect component state and props

**Redux DevTools (not used):**
- Not applicable (using local state)

**Network Inspector:**
- Monitor REST API calls
- Inspect WebSocket frames

**Vite Hot Module Replacement:**
- Instant updates without page reload
- Preserves component state where possible

### Common Issues

**Issue**: "process is not defined" error

**Solution**: Use `import.meta.env.VITE_*` instead of `process.env.REACT_APP_*`

---

**Issue**: WebSocket connection fails

**Solution**:
- Verify backend is running on correct port
- Check CORS configuration in backend
- Ensure `VITE_API_URL` is correct

---

**Issue**: Room code not visible

**Solution**:
- Check CSS for `.room-code strong` selector
- Verify contrast/styling in `HostDashboard.css`

---

**Issue**: Votes not syncing in real-time

**Solution**:
- Check browser console for WebSocket errors
- Verify host joined Socket.io room (should see "Host joined room" log)
- Check backend logs for broadcast events

## 📈 Performance

### Bundle Size

```bash
# Check bundle size
npm run build

# Analyze bundle
npm run build -- --stats
```

### Optimization Tips

- **Code Splitting**: Use dynamic imports for routes
- **Lazy Loading**: Load Chart.js only when needed
- **Memoization**: Use React.memo for expensive components
- **WebSocket**: Single connection, reused across app

## 🔐 Security Considerations

### Current Limitations

- **No authentication**: Nickname-only identification
- **No XSS protection**: Add input sanitization
- **No CSRF protection**: Not needed for MVP (no sensitive actions)
- **SessionStorage**: Stored in plaintext (not sensitive data)

### Production Recommendations

1. Add input sanitization (DOMPurify)
2. Implement Content Security Policy (CSP)
3. Add authentication (JWT)
4. Use HTTPS/WSS
5. Add rate limiting on frontend (debounce)
6. Validate all user inputs

## 🚀 Deployment

### Build for Production

```bash
# Create production build
npm run build

# Output in dist/ directory
ls dist/
```

### Deployment Options

**Static Hosting:**
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

**Server Deployment:**
- Node.js server (serve `dist/`)
- Nginx (static files)
- Docker container

**Environment Variables:**
- Set `VITE_API_URL` to production backend URL
- Rebuild after changing environment variables

## 🤝 Contributing

1. Follow React best practices
2. Use functional components and hooks
3. Keep components focused and reusable
4. Add PropTypes or TypeScript (future)
5. Test changes manually and with backend tests
6. Ensure accessibility (ARIA labels, keyboard navigation)

## 📝 License

See root repository LICENSE file.

## 🔗 Related Documentation

- [Backend README](../backend/README.md)
- [Project README](../README.md)
- [Feature Specification](../specs/001-voting-app-mvp/spec.md)
