# Zephyr Voting App - Backend

Real-time voting backend built with Node.js, Express, and Socket.io for small group polling (5-20 participants).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- tests/unit/PollManager.test.js

# Lint code
npm run lint

# Format code
npm run format
```

## 📋 Prerequisites

- Node.js 18+ (LTS)
- npm 9+

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.1.0
- **WebSocket**: Socket.io 4.8.1
- **Storage**: In-memory (Map-based)
- **Logging**: Pino
- **Testing**: Jest 30.x
- **Code Quality**: ESLint (Airbnb), Prettier, Husky

### Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   └── validator.js         # Request validation
│   │   └── routes/
│   │       ├── healthRoutes.js      # Health check endpoint
│   │       └── pollRoutes.js        # Poll CRUD endpoints
│   ├── config/
│   │   ├── index.js                 # Environment configuration
│   │   └── logger.js                # Pino logger setup
│   ├── models/
│   │   └── PollManager.js           # In-memory poll data model
│   ├── services/
│   │   └── roomCodeGenerator.js    # Unique room code generation
│   ├── sockets/
│   │   ├── events/
│   │   │   ├── changePollState.js  # Host state control
│   │   │   ├── joinRoom.js         # Participant join
│   │   │   └── submitVote.js       # Vote submission
│   │   ├── emitters/
│   │   │   ├── broadcastStateChange.js # Broadcast poll state
│   │   │   └── broadcastVoteUpdate.js  # Broadcast vote counts
│   │   └── socketHandler.js        # Socket.io connection handler
│   └── server.js                    # Application entry point
├── tests/
│   ├── unit/                        # Unit tests (models, services)
│   ├── contract/                    # API/WebSocket contract tests
│   ├── integration/                 # Integration tests (full flows)
│   └── performance/                 # Performance tests (20+ participants)
├── .env                             # Environment variables
├── .eslintrc.js                     # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── jest.config.js                   # Jest configuration
└── package.json                     # Dependencies and scripts
```

## 🔌 API Reference

### REST Endpoints

#### Health Check
```http
GET /api/health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T21:00:00.000Z"
}
```

#### Create Poll
```http
POST /api/polls
Content-Type: application/json

{
  "question": "What is your favorite programming language?",
  "options": ["JavaScript", "Python", "Go", "Rust"]
}
```

**Response:**
```json
{
  "success": true,
  "poll": {
    "roomCode": "3B7KWX",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "state": "waiting",
    "createdAt": "2025-11-07T21:00:00.000Z"
  }
}
```

**Validation Rules:**
- `question`: Required, 1-500 characters
- `options`: Required array, 2-5 items, each 1-100 characters
- Unique room codes generated automatically

#### Get Poll
```http
GET /api/polls/:roomCode
```

**Response:**
```json
{
  "success": true,
  "poll": {
    "roomCode": "3B7KWX",
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "Python", "Go", "Rust"],
    "state": "open",
    "votes": [5, 3, 2, 1],
    "percentages": [45.45, 27.27, 18.18, 9.09],
    "participantCount": 11
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Poll not found"
}
```

### WebSocket Events

#### Client → Server

**Join Room (Participant)**
```javascript
socket.emit('join-room', { roomCode, nickname }, (response) => {
  // response: { success: true, poll: {...} }
});
```

**Submit Vote**
```javascript
socket.emit('submit-vote', { roomCode, nickname, optionIndex }, (response) => {
  // response: { success: true } or { success: false, error: '...' }
});
```

**Change Poll State (Host)**
```javascript
socket.emit('change-poll-state', { roomCode, newState }, (response) => {
  // newState: 'open' | 'closed'
  // response: { success: true, state: 'open' }
});
```

**Join Room (Host - Simple)**
```javascript
socket.emit('join', roomCode);
// No acknowledgment, used for host to join Socket.io room
```

#### Server → Client

**Participant Joined**
```javascript
socket.on('participant-joined', (data) => {
  // data: { nickname: 'Alice', count: 5, timestamp: '...' }
});
```

**Participant Left**
```javascript
socket.on('participant-left', (data) => {
  // data: { nickname: 'Bob', count: 4, timestamp: '...' }
});
```

**Vote Update**
```javascript
socket.on('vote-update', (data) => {
  // data: { votes: [5, 3, 2, 1], percentages: [45.45, 27.27, 18.18, 9.09] }
});
```

**Poll State Changed**
```javascript
socket.on('poll-state-changed', (data) => {
  // data: { newState: 'open', previousState: 'waiting', timestamp: '...' }
});
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3000
```

**Variables:**
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development, test, production)
- `LOG_LEVEL`: Logging level (trace, debug, info, warn, error, fatal)
- `FRONTEND_URL`: Frontend URL for CORS

## 🧪 Testing

### Test Coverage

Current coverage: **95.53%**

```bash
# Run all tests with coverage
npm test -- --coverage

# Run specific test suite
npm test -- tests/unit/PollManager.test.js
npm test -- tests/contract/pollApi.test.js
npm test -- tests/integration/hostFlow.test.js

# Run tests in watch mode
npm run test:watch
```

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - PollManager methods (create, vote, state changes)
   - Room code generator
   - Service logic

2. **Contract Tests** (`tests/contract/`)
   - REST API endpoints
   - WebSocket event schemas
   - Request/response validation

3. **Integration Tests** (`tests/integration/`)
   - Complete host flow (create → open → close)
   - Participant flow (join → vote → change vote)
   - Real-time synchronization

4. **Performance Tests** (`tests/performance/`)
   - 20 concurrent participants
   - Vote broadcast latency (<2s requirement)
   - Current max latency: 13ms

## 📊 Data Model

### Poll Object

```javascript
{
  roomCode: String,        // 6-character unique code
  question: String,        // Poll question (1-500 chars)
  options: Array<String>,  // 2-5 options (each 1-100 chars)
  state: String,           // 'waiting' | 'open' | 'closed'
  votes: Map,              // nickname → optionIndex
  participants: Map,       // socketId → nickname
  createdAt: Date          // Creation timestamp
}
```

### Room Code Format

- **Length**: 6 characters
- **Alphabet**: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
- **Excludes**: 0, 1, O, I (to avoid confusion)
- **Example**: 3B7KWX

## 🔐 Security Considerations

### MVP Limitations

- **No authentication**: Nickname-only identification
- **No authorization**: Any client can be a host
- **No persistence**: Data lost on server restart
- **No encryption**: WebSocket traffic not encrypted (use HTTPS/WSS in production)
- **No rate limiting**: Vulnerable to spam/DoS (add in production)

### Production Recommendations

1. Add authentication (JWT, OAuth)
2. Implement rate limiting
3. Add input sanitization
4. Use HTTPS/WSS
5. Add persistent storage
6. Implement authorization (host vs participant roles)
7. Add request validation middleware

## 🚦 Error Handling

All errors are handled by centralized middleware:

```javascript
// Example error response
{
  "success": false,
  "error": "Poll not found",
  "timestamp": "2025-11-07T21:00:00.000Z"
}
```

**Common Error Codes:**
- `400 Bad Request`: Invalid input (validation errors)
- `404 Not Found`: Poll/resource not found
- `500 Internal Server Error`: Server-side errors

## 📈 Performance

### Benchmarks

- **Max participants**: 20 per poll
- **Vote broadcast latency**: <2s (requirement), 13ms (actual max)
- **Memory usage**: In-memory Map-based storage
- **Concurrent polls**: No hard limit (memory-dependent)

### Scalability Notes

- Current implementation: Single-server, in-memory
- For production scale:
  - Add Redis for session/state storage
  - Use Socket.io Redis adapter for multi-server
  - Add database for persistence
  - Implement horizontal scaling

## 🐛 Debugging

### Logging

All logs use Pino structured logging:

```javascript
logger.info({ roomCode, state }, 'Poll state changed');
logger.error({ error, socketId }, 'Failed to process vote');
```

### Development Tips

```bash
# Start with debug logging
LOG_LEVEL=debug npm start

# Watch tests during development
npm run test:watch

# Check specific socket events
# Add console.log in src/sockets/socketHandler.js
```

## 🤝 Contributing

1. Follow Airbnb JavaScript Style Guide
2. Write tests before implementation (TDD)
3. Ensure tests pass: `npm test`
4. Lint code: `npm run lint`
5. Format code: `npm run format`
6. Pre-commit hooks enforce quality checks

## 📝 License

See root repository LICENSE file.

## 🚢 Deployment

### Production Deployment Overview

The application supports containerized deployment with automated CI/CD pipelines, database migrations, and zero-downtime deployments.

**Deployment Environments:**
- **Local**: Docker Compose for development
- **Staging**: Automated deployment on push to `main` branch
- **Production**: Manual workflow dispatch with approval gates

### Prerequisites

**Infrastructure Requirements:**
- PostgreSQL 14+ (managed service recommended: AWS RDS, GCP Cloud SQL)
- Redis 7+ (managed service recommended: AWS ElastiCache, GCP Memorystore)
- Container orchestration (Kubernetes, AWS ECS, Docker Swarm)
- Secret management (AWS Secrets Manager, HashiCorp Vault, or similar)

**CI/CD Requirements:**
- GitHub Actions (workflows in `.github/workflows/`)
- Container registry (GitHub Container Registry or AWS ECR)
- Deployment credentials configured in GitHub Secrets

### Local Development with Docker

```bash
# Start all services (PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# Run database migrations
npm run migrate:up

# Start backend
npm run dev

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Access Points:**
- Backend API: http://localhost:4000
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- pgAdmin: http://localhost:5050

### Building Docker Image

```bash
# Build production image
docker build -t zephyr-backend:latest ./backend

# Build with specific tag
docker build -t zephyr-backend:v2.0.0 ./backend

# Multi-architecture build
docker buildx build --platform linux/amd64,linux/arm64 -t zephyr-backend:latest ./backend
```

**Image Details:**
- Base: Node.js 18 Alpine (multi-stage build)
- Size: ~150MB (production dependencies only)
- Non-root user: `nodejs`
- Health check: `/api/health/live` endpoint
- Signal handling: `dumb-init` for proper SIGTERM handling

### Environment Configuration

#### Production Environment Variables

Create `.env.production` with required variables (see `.env.production` template):

```bash
# Required variables
NODE_ENV=production
DB_HOST=<database-host>
DB_PASSWORD=<from-secrets-manager>
REDIS_HOST=<redis-host>
ALLOWED_ORIGINS=https://app.example.com

# Optional variables
HOST_AUTH_ENABLED=true
SECRET_BACKEND=aws
```

**Configuration Validation:**
- Application validates all required variables at startup
- Fails fast with descriptive errors if misconfigured
- Production mode requires explicit DB_PASSWORD, REDIS_HOST, ALLOWED_ORIGINS

**Secret Management:**
- Development: `.env` files (git-ignored)
- Staging/Production: AWS Secrets Manager, Vault, or cloud provider secrets
- Configure via `SECRET_BACKEND` environment variable

### Database Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create <migration_name>
```

**Migration Strategy:**
- Automated in CI/CD pipeline (runs before deployment)
- Reversible migrations for safe rollbacks
- Version-controlled in `src/migrations/`
- Transactional execution (PostgreSQL)

### Deployment Workflows

#### 1. Test Workflow (`.github/workflows/test.yml`)

**Triggers**: Push to any branch, PRs to main/develop

**Steps:**
1. Lint code (ESLint, Prettier)
2. Run unit tests
3. Run integration tests (with PostgreSQL, Redis services)
4. Run contract tests
5. Security audit (npm audit)
6. Upload coverage reports

#### 2. Build Workflow (`.github/workflows/build.yml`)

**Triggers**: Push to main/develop, tags

**Steps:**
1. Build multi-arch Docker image (amd64, arm64)
2. Push to GitHub Container Registry
3. Generate SBOM (Software Bill of Materials)
4. Scan for vulnerabilities (Trivy)
5. Upload security scan results

**Image Tags:**
- `latest`: Latest build from main branch
- `<branch>-<sha>`: Branch-specific builds
- `v<version>`: Semantic version tags

#### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers**: Manual workflow dispatch

**Steps:**
1. Pull Docker image from registry
2. Run database migrations
3. Deploy to target environment (ECS/EKS/EC2)
4. Wait for deployment to stabilize
5. Run smoke tests (health checks)
6. Rollback on failure
7. Send deployment notifications

**Deployment Environments:**
- **Staging**: Auto-deploy from main branch
- **Production**: Manual approval required

### Manual Deployment (SSH/Docker Compose)

```bash
# SSH to server
ssh user@production-server

# Pull latest code
cd /opt/zephyr
git pull origin main

# Copy environment configuration
cp .env.production .env

# Pull latest Docker images
docker compose -f docker-compose.prod.yml pull

# Run database migrations
docker compose run --rm backend npm run migrate:up

# Deploy with zero-downtime
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# Verify deployment
curl https://api.example.com/api/health
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl rollout status deployment/zephyr-backend

# View pods
kubectl get pods -l app=zephyr-backend

# View logs
kubectl logs -f deployment/zephyr-backend

# Rollback deployment
kubectl rollout undo deployment/zephyr-backend
```

**Kubernetes Resources:**
- Deployment: `k8s/deployment.yaml`
- Service: `k8s/service.yaml`
- ConfigMap: `k8s/configmap.yaml`
- Secrets: Use External Secrets Operator or Sealed Secrets

### Health Checks

**Endpoints:**
- `/api/health`: Overall health with dependency status
- `/api/health/ready`: Readiness probe (database/Redis available)
- `/api/health/live`: Liveness probe (process responsive)

**Load Balancer Configuration:**
```yaml
healthCheck:
  path: /api/health/ready
  interval: 30s
  timeout: 5s
  healthyThreshold: 2
  unhealthyThreshold: 3
```

### Monitoring & Observability

**Metrics:**
- Endpoint: `/metrics` (Prometheus format)
- Collection: Prometheus scrapes every 15 seconds
- Visualization: Grafana dashboards (see `backend/grafana/dashboards/`)

**Logging:**
- Format: Structured JSON (Pino)
- Correlation IDs: Tracked across all requests
- Log Levels: debug, info, warn, error
- Aggregation: CloudWatch Logs, Loki, or similar

**Alerts:**
- High error rate (>5% for 2 minutes)
- Slow database queries (P95 >100ms)
- High memory usage (>90% for 5 minutes)
- Configuration: `backend/prometheus-alerts.yml`

### Graceful Shutdown

The application handles SIGTERM/SIGINT signals gracefully:

1. Stop accepting new connections
2. Close WebSocket connections cleanly
3. Drain in-flight requests
4. Close database connections
5. Close Redis connections
6. Exit within 30 seconds (forced timeout)

**Testing Graceful Shutdown:**
```bash
# Send SIGTERM
kill -TERM <process_id>

# Verify clean shutdown in logs
# Should see: "Graceful shutdown complete"
```

### Rollback Procedures

**Automated Rollback:**
- Deployment workflow automatically rolls back on health check failure
- Kubernetes rollback: `kubectl rollout undo deployment/zephyr-backend`

**Manual Rollback:**
```bash
# Revert to previous image tag
docker tag zephyr-backend:v1.9.0 zephyr-backend:latest
docker compose up -d backend

# Or revert database migration
npm run migrate:down
```

### Production Checklist

Before deploying to production:

- [ ] Environment variables configured in secret manager
- [ ] Database backups enabled (automated RDS backups)
- [ ] Redis persistence configured (AOF enabled)
- [ ] HTTPS/TLS certificates configured
- [ ] CORS origins whitelisted (no wildcards)
- [ ] Rate limiting enabled
- [ ] Monitoring and alerting configured
- [ ] Log aggregation configured
- [ ] Deployment runbook documented
- [ ] Incident response plan in place
- [ ] Database migrations tested in staging
- [ ] Load testing completed
- [ ] Security audit passed (npm audit)

### Troubleshooting

**Common Issues:**

1. **Database connection failed**
   - Check DB_HOST, DB_PORT, DB_PASSWORD in environment
   - Verify security group allows connections
   - Check database is running: `pg_isready -h <host>`

2. **Redis connection failed**
   - Verify REDIS_HOST, REDIS_PORT configuration
   - Check Redis authentication (REDIS_PASSWORD)
   - Test connection: `redis-cli -h <host> ping`

3. **Migration failed**
   - Check database permissions (CREATE, ALTER tables)
   - Review migration logs: `npm run migrate:status`
   - Rollback failed migration: `npm run migrate:down`

4. **Container won't start**
   - Check logs: `docker logs <container>`
   - Verify environment variables loaded
   - Check port conflicts: `lsof -i :4000`

5. **Health checks failing**
   - Check `/api/health/ready` endpoint
   - Verify database and Redis connectivity
   - Review application logs for errors

### Performance Optimization

**Production Settings:**
- Node.js memory: `NODE_OPTIONS=--max-old-space-size=2048`
- Database pool size: `DB_POOL_MAX=20`
- Redis connection timeout: `REDIS_TIMEOUT=1000`
- Rate limit window: `RATE_LIMIT_WINDOW_MS=900000` (15 min)

**Scaling:**
- Horizontal: Multiple backend instances with Redis adapter (User Story 5)
- Vertical: Increase container resources (CPU, memory)
- Database: Connection pooling (already configured)
- Redis: Clustered mode for high availability

### Security Best Practices

1. **Secrets Management**
   - Never commit `.env.production` with real credentials
   - Use AWS Secrets Manager, Vault, or cloud provider secrets
   - Rotate credentials every 90 days

2. **Network Security**
   - Use VPC/security groups to restrict access
   - Database and Redis should NOT be publicly accessible
   - Enable encryption in transit (TLS)

3. **Container Security**
   - Run as non-root user (already configured)
   - Scan images for vulnerabilities (Trivy in CI/CD)
   - Use minimal base images (Alpine)

4. **Application Security**
   - Rate limiting enabled (100 req/15min default)
   - Input validation and sanitization (Joi + XSS)
   - Security headers (helmet.js)
   - CORS whitelist (no wildcards in production)

## 🔗 Related Documentation

- [Frontend README](../frontend/README.md)
- [Project README](../README.md)
- [Feature Specification](../specs/001-voting-app-mvp/spec.md)
- [Quickstart Guide](../specs/002-production-ready/quickstart.md)
- [Data Model](../specs/002-production-ready/data-model.md)
- [API Contracts](../specs/002-production-ready/contracts/)
