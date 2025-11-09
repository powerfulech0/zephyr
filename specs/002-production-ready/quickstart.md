# Quickstart: Production-Ready Development Environment

**Feature**: 002-production-ready
**Date**: 2025-11-07
**Purpose**: Local development setup with production-parity infrastructure

## Overview

This quickstart guide sets up a complete local development environment using Docker Compose, providing parity with production infrastructure:

- **PostgreSQL 14**: Database with pgAdmin UI
- **Redis 7**: Caching and session store
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization and dashboards
- **Backend**: Node.js application

**Benefits**:
- Develop against real database (not in-memory)
- Test horizontal scaling locally (multiple backend instances)
- Visualize metrics in Grafana
- Debug with production-like infrastructure

---

## Prerequisites

**Required**:
- Docker 24+ and Docker Compose 2+ ([Install Docker](https://docs.docker.com/get-docker/))
- Node.js 18+ LTS ([Install Node.js](https://nodejs.org/))
- Git

**Verify Installation**:
```bash
docker --version          # Should show 24.0.0 or higher
docker compose version    # Should show 2.0.0 or higher
node --version            # Should show v18.0.0 or higher
npm --version             # Should show 9.0.0 or higher
```

---

## Quick Start (5 Minutes)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/zephyr.git
cd zephyr

# Checkout production-ready branch
git checkout 002-production-ready

# Install backend dependencies
cd backend
npm install
```

### 2. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# Verify services are running
docker compose ps
```

**Expected Output**:
```
NAME                    STATUS              PORTS
zephyr-postgres         Up 10 seconds       0.0.0.0:5432->5432/tcp
zephyr-redis            Up 10 seconds       0.0.0.0:6379->6379/tcp
zephyr-prometheus       Up 10 seconds       0.0.0.0:9090->9090/tcp
zephyr-grafana          Up 10 seconds       0.0.0.0:3001->3000/tcp
zephyr-pgadmin          Up 10 seconds       0.0.0.0:5050->80/tcp
```

### 3. Run Database Migrations

```bash
# Create database schema
npm run migrate:up

# Verify migration success (shows pending migrations)
npm run migrate:status
```

### 4. Start Backend

```bash
# Start development server with auto-reload
npm run dev
```

**Expected Output**:
```
[INFO]  Server listening on port 4000
[INFO]  Database connected: PostgreSQL 14.5
[INFO]  Redis connected: Redis 7.0.5
[INFO]  Socket.io initialized
```

### 5. Verify Services

Open in browser:
- **Backend API**: http://localhost:4000/api/health
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **pgAdmin**: http://localhost:5050 (admin@zephyr.local/admin)

---

## Docker Compose Configuration

### File: `backend/docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:14-alpine
    container_name: zephyr-postgres
    environment:
      POSTGRES_USER: zephyr
      POSTGRES_PASSWORD: zephyr_dev_password
      POSTGRES_DB: zephyr_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zephyr"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: zephyr-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: zephyr-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    depends_on:
      - backend

  grafana:
    image: grafana/grafana:10.0.0
    container_name: zephyr-grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: false
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: zephyr-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@zephyr.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  pgadmin_data:

networks:
  default:
    name: zephyr-network
```

---

## Environment Configuration

### File: `backend/.env.development`

```bash
# Server
NODE_ENV=development
PORT=4000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zephyr_dev
DB_USER=zephyr
DB_PASSWORD=zephyr_dev_password
DB_POOL_MAX=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100            # 100 requests per window

# Data Retention
POLL_RETENTION_DAYS=30
AUDIT_LOG_RETENTION_DAYS=90

# Secret Management
SECRET_BACKEND=env  # Options: env, vault, aws
```

**Usage**:
```bash
# Copy example to active config
cp .env.example .env.development

# Backend automatically loads .env.development in development mode
npm run dev
```

---

## Prometheus Configuration

### File: `backend/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'zephyr-backend'
    static_configs:
      - targets: ['host.docker.internal:4000']  # Docker host.docker.internal resolves to host machine
    metrics_path: '/metrics'
    scrape_interval: 10s
```

---

## Grafana Dashboards

### Auto-Provisioned Datasource

**File**: `backend/grafana/datasources/prometheus.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Sample Dashboard

**File**: `backend/grafana/dashboards/zephyr-overview.json`

Includes panels for:
- Request rate (RPS)
- Error rate
- P95 response time
- Active WebSocket connections
- Database query performance
- Memory usage

*(Full JSON dashboard config provided in implementation phase)*

---

## Database Management

### Run Migrations

```bash
# Up: Apply all pending migrations
npm run migrate:up

# Down: Rollback last migration
npm run migrate:down

# Check: View pending migrations
npm run migrate:status

# Create: Generate new migration
npm run migrate:create add_audit_logs_table
```

### Access Database

**Via psql CLI**:
```bash
# Connect to PostgreSQL
docker exec -it zephyr-postgres psql -U zephyr -d zephyr_dev

# Example queries
\dt                         # List tables
\d polls                    # Describe polls table
SELECT * FROM polls LIMIT 10;
\q                          # Quit
```

**Via pgAdmin UI** (http://localhost:5050):
1. Login: admin@zephyr.local / admin
2. Add Server:
   - Name: Zephyr Dev
   - Host: postgres (Docker network name)
   - Port: 5432
   - Username: zephyr
   - Password: zephyr_dev_password

### Seed Test Data

```bash
# Seed database with test polls
npm run db:seed

# Reset database (drop all tables, re-migrate, seed)
npm run db:reset
```

---

## Testing

### Run All Tests

```bash
# Unit + Integration + Contract tests
npm test

# With coverage report
npm test -- --coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

### Test Against Real Infrastructure

```bash
# Integration tests use database and Redis from Docker Compose
# Ensure services are running first
docker compose ps

# Run integration tests
npm test -- tests/integration

# Run performance tests (20 concurrent participants)
npm test -- tests/performance/concurrentParticipants.test.js
```

---

## Development Workflows

### Scenario 1: Test Database Persistence

```bash
# 1. Start services
docker compose up -d
npm run dev

# 2. Create a poll via API
curl -X POST http://localhost:4000/api/polls \
  -H "Content-Type: application/json" \
  -d '{"question":"Test poll?","options":["A","B","C"]}'

# 3. Restart backend (simulates deployment)
# Press Ctrl+C to stop, then:
npm run dev

# 4. Verify poll persisted
curl http://localhost:4000/api/polls/[ROOM_CODE]
# Should return poll data
```

### Scenario 2: Monitor Metrics

```bash
# 1. Generate some load
for i in {1..100}; do
  curl http://localhost:4000/api/health
done

# 2. View metrics in Prometheus
# Open http://localhost:9090/graph
# Query: rate(http_requests_total[1m])

# 3. View dashboard in Grafana
# Open http://localhost:3001
# Navigate to Dashboards → Zephyr Overview
```

### Scenario 3: Test Rate Limiting

```bash
# Send 200 requests rapidly (exceeds limit of 100 per 15 min)
for i in {1..200}; do
  curl -w "%{http_code}\n" http://localhost:4000/api/health
done

# Expected: First 100 return 200, rest return 429 (Too Many Requests)

# Check rate limit metrics
curl http://localhost:4000/metrics | grep rate_limit_exceeded
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker compose logs postgres
docker compose logs redis

# Common issues:
# - Port 5432 already in use: Stop local PostgreSQL service
# - Port 6379 already in use: Stop local Redis service

# Kill conflicting services
sudo systemctl stop postgresql
sudo systemctl stop redis
```

### Database Connection Errors

```bash
# Verify PostgreSQL is ready
docker compose exec postgres pg_isready -U zephyr

# Check credentials in .env.development match docker-compose.yml
cat .env.development | grep DB_
```

### Migration Failures

```bash
# Check pending migrations
npm run migrate:status

# Rollback failed migration
npm run migrate:down

# Fix migration file (backend/src/migrations/*.js)

# Re-run migration
npm run migrate:up
```

### Memory Issues (Docker)

```bash
# Increase Docker memory limit (Docker Desktop → Settings → Resources)
# Recommended: 4GB minimum

# Check container memory usage
docker stats
```

---

## Stopping Services

```bash
# Stop backend
# Press Ctrl+C in terminal running npm run dev

# Stop Docker services (keep data)
docker compose stop

# Stop and remove containers (keep data volumes)
docker compose down

# Stop and remove everything including data (⚠️ DESTRUCTIVE)
docker compose down -v
```

---

## Production Parity Checklist

- [x] PostgreSQL database (same version as production)
- [x] Redis caching (same version as production)
- [x] Prometheus metrics collection
- [x] Grafana dashboards
- [x] Environment variable configuration
- [x] Database migrations (reversible, automated)
- [x] Connection pooling configured
- [x] Rate limiting enabled
- [x] Security headers configured (helmet.js)
- [x] Structured logging (Pino)
- [x] Health check endpoints

**What's Different from Production**:
- No secret vault (uses .env files)
- No horizontal scaling (single backend instance)
- No load balancer
- No automated backups
- No SSL/TLS (HTTP instead of HTTPS)
- Relaxed CORS policy (allows localhost:3000)

---

## Next Steps

1. **Implement P1 (Data Persistence)**:
   - Create repository classes (`PollRepository`, `ParticipantRepository`, `VoteRepository`)
   - Update Socket.io event handlers to use repositories
   - Write integration tests with real database

2. **Implement P2 (Security)**:
   - Add input validation middleware (Joi schemas)
   - Add sanitization (xss library)
   - Add security headers (helmet)
   - Configure rate limiting

3. **Implement P3 (Monitoring)**:
   - Instrument HTTP requests (prom-client)
   - Instrument WebSocket events
   - Configure Grafana dashboards
   - Set up alert rules

4. **Implement P4 (Deployment)**:
   - Create Dockerfile
   - Set up GitHub Actions CI/CD pipeline
   - Configure secret management (AWS Secrets Manager or Vault)

5. **Implement P5 (Scalability)**:
   - Add Socket.io Redis adapter
   - Test with multiple backend instances
   - Configure session state sharing

6. **Implement P6 (Resilience)**:
   - Add retry logic with exponential backoff
   - Implement circuit breakers
   - Add graceful shutdown handling
   - Configure WebSocket reconnection

---

## Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/14/
- **Redis Docs**: https://redis.io/docs/
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Pino Logger**: https://getpino.io/
- **Joi Validation**: https://joi.dev/api/
