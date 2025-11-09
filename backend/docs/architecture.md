# Zephyr Voting App - System Architecture

**Version**: 2.0.0 (Production-Ready)
**Last Updated**: 2025-11-09
**Status**: Production

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Diagram](#component-diagram)
4. [Data Flow](#data-flow)
5. [Deployment Architecture](#deployment-architecture)
6. [Technology Stack](#technology-stack)
7. [Scalability & Performance](#scalability--performance)
8. [Security Architecture](#security-architecture)
9. [Monitoring & Observability](#monitoring--observability)
10. [Disaster Recovery](#disaster-recovery)

---

## Overview

Zephyr is a real-time voting application designed for small group polling (5-20 participants). The system enables hosts to create polls and participants to vote in real-time, with live result updates.

**Key Features**:
- Real-time vote updates via WebSocket
- Data persistence with zero data loss
- Horizontal scalability across multiple instances
- Production-ready security, monitoring, and resilience

**Service Level Objectives (SLOs)**:
- **Uptime**: 99.9% during business hours
- **Latency**: P95 <500ms for API requests, <100ms for database queries
- **Error Rate**: <1% of total requests
- **MTTR**: <30 minutes for critical incidents

---

## High-Level Architecture

```text
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTPS/WSS
       │
┌──────▼────────────────────────────────────────────────┐
│              Load Balancer                            │
│         (Sticky Sessions for WebSocket)               │
└──────┬───────────────────────────┬────────────────────┘
       │                           │
       │ HTTP/WebSocket            │ HTTP/WebSocket
       │                           │
┌──────▼──────────┐       ┌────────▼────────────┐
│  Backend        │       │  Backend            │
│  Instance 1     │       │  Instance 2         │
│  (Node.js)      │◄─────►│  (Node.js)          │
└──────┬──────────┘       └────────┬────────────┘
       │                           │
       │      ┌────────────────────┘
       │      │
       │      │ Redis Pub/Sub (WebSocket broadcasting)
       │      │
┌──────▼──────▼────────┐
│      Redis           │
│  (Session Store &    │
│   Pub/Sub)           │
└──────────────────────┘
       │
       │
┌──────▼────────────────┐
│   PostgreSQL          │
│  (Persistent Data)    │
│  - Polls              │
│  - Participants       │
│  - Votes              │
│  - Audit Logs         │
└───────────────────────┘

┌───────────────────────┐
│   Prometheus          │
│  (Metrics Collection) │◄──── Scrapes /metrics endpoint
└───────────────────────┘
       │
┌──────▼────────────────┐
│     Grafana           │
│  (Dashboards &        │
│   Alerting)           │
└───────────────────────┘
```

---

## Component Diagram

### Backend Application Components

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Express Server (Port 4000)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Middleware Layer                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ - CORS                    - Security Headers (helmet)   │   │
│  │ - Rate Limiting           - Correlation ID              │   │
│  │ - Request Validation      - Metrics Collection          │   │
│  │ - Error Handler           - Load Shedding               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐         ┌─────────────────────────┐      │
│  │   REST API       │         │   WebSocket Handler     │      │
│  ├──────────────────┤         ├─────────────────────────┤      │
│  │ POST /api/polls  │         │ Events:                 │      │
│  │ GET  /api/polls  │         │ - join-room             │      │
│  │ GET  /api/health │         │ - submit-vote           │      │
│  │ GET  /metrics    │         │ - change-poll-state     │      │
│  └────────┬─────────┘         └───────────┬─────────────┘      │
│           │                               │                    │
│           │                               │                    │
│  ┌────────▼───────────────────────────────▼─────────────┐      │
│  │              Service Layer                            │      │
│  ├───────────────────────────────────────────────────────┤      │
│  │ pollService       - Business logic for polls          │      │
│  │ sessionService    - Session management                │      │
│  │ metricsService    - Metrics collection                │      │
│  │ resilienceService - Retry, circuit breaker logic      │      │
│  └────────┬──────────────────────────────────────────────┘      │
│           │                                                     │
│  ┌────────▼───────────────────────────────────────┐            │
│  │          Repository Layer (Data Access)        │            │
│  ├────────────────────────────────────────────────┤            │
│  │ PollRepository        - CRUD for polls         │            │
│  │ ParticipantRepository - CRUD for participants  │            │
│  │ VoteRepository        - CRUD for votes         │            │
│  │ AuditLogRepository    - Security event logging │            │
│  └────────┬───────────────────────────────────────┘            │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │
    ┌───────▼────────┐          ┌──────────┐
    │  PostgreSQL    │          │  Redis   │
    │  Connection    │          │  Client  │
    │  Pool          │          │          │
    └────────────────┘          └──────────┘
```

---

## Data Flow

### 1. Poll Creation Flow (Host)

```text
1. Client → POST /api/polls {question, options}
2. Middleware → Validate (Joi), Sanitize (XSS), Rate Limit
3. pollService → Business logic validation
4. PollRepository → INSERT into polls table
5. PostgreSQL → Return poll with roomCode
6. Response → {roomCode: "3B7KWX", ...}
7. Host → WebSocket join room (emit 'join', roomCode)
8. Socket.io → Join room for real-time updates
```

### 2. Participant Join Flow

```text
1. Client → WebSocket emit 'join-room' {roomCode, nickname}
2. Middleware → Validate, Rate Limit
3. PollRepository → Verify poll exists
4. ParticipantRepository → INSERT participant (unique constraint on nickname)
5. Socket.io → Join Socket.io room
6. SessionService → Store session in Redis {socket_id, poll_id}
7. Broadcast → 'participant-joined' to all in room
```

### 3. Vote Submission Flow

```text
1. Client → WebSocket emit 'submit-vote' {roomCode, nickname, optionIndex}
2. Middleware → Validate vote (option_index in range)
3. VoteRepository → UPSERT vote (participant can change vote)
4. PostgreSQL → Store vote with timestamp
5. VoteRepository → Aggregate vote counts
6. Socket.io + Redis Pub/Sub → Broadcast 'vote-update' to ALL instances
7. All clients in room → Receive updated vote counts
```

### 4. Multi-Instance Broadcasting (Redis Adapter)

```text
┌──────────────┐                    ┌──────────────┐
│  Instance 1  │                    │  Instance 2  │
│  Participant │                    │  Participant │
│  A (votes)   │                    │  B (waiting) │
└──────┬───────┘                    └──────▲───────┘
       │                                   │
       │ 1. emit 'submit-vote'             │
       ▼                                   │
┌────────────────┐                         │
│ Socket Handler │                         │
│  (Instance 1)  │                         │
└──────┬─────────┘                         │
       │                                   │
       │ 2. Save vote to DB                │
       ▼                                   │
┌────────────────┐                         │
│  VoteRepository│                         │
└──────┬─────────┘                         │
       │                                   │
       │ 3. Broadcast via Redis Pub/Sub   │
       ▼                                   │
┌──────────────────────────────────────────┤
│          Redis (Pub/Sub Channel)         │
└──────────────────────────────────────────┤
                                           │
       4. Subscribe to channel             │
                                           ▼
                              ┌─────────────────────┐
                              │  Socket.io Adapter  │
                              │    (Instance 2)     │
                              └─────────┬───────────┘
                                        │
                5. Emit 'vote-update'   │
                                        ▼
                              ┌──────────────────┐
                              │  Participant B   │
                              │  (receives live  │
                              │   vote counts)   │
                              └──────────────────┘
```

---

## Deployment Architecture

### Single Region Deployment

```text
┌────────────────────────────────────────────────────────────────┐
│                         AWS Region (us-east-1)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                 VPC (10.0.0.0/16)                        │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  ┌────────────────────────┐  ┌────────────────────────┐ │ │
│  │  │  Public Subnet         │  │  Public Subnet         │ │
│  │  │  (10.0.1.0/24)         │  │  (10.0.2.0/24)         │ │
│  │  │  AZ-1a                 │  │  AZ-1b                 │ │
│  │  ├────────────────────────┤  ├────────────────────────┤ │ │
│  │  │                        │  │                        │ │ │
│  │  │  ┌──────────────────┐  │  │  ┌──────────────────┐  │ │ │
│  │  │  │ Application      │  │  │  │ Application      │  │ │ │
│  │  │  │ Load Balancer    │◄─┼──┼─►│ Load Balancer    │  │ │ │
│  │  │  └────────┬─────────┘  │  │  └────────┬─────────┘  │ │ │
│  │  │           │            │  │           │            │ │ │
│  │  │  ┌────────▼─────────┐  │  │  ┌────────▼─────────┐  │ │ │
│  │  │  │ ECS Task /       │  │  │  │ ECS Task /       │  │ │ │
│  │  │  │ Kubernetes Pod   │  │  │  │ Kubernetes Pod   │  │ │ │
│  │  │  │ (Backend)        │  │  │  │ (Backend)        │  │ │ │
│  │  │  └──────────────────┘  │  │  └──────────────────┘  │ │ │
│  │  └────────────────────────┘  └────────────────────────┘ │ │
│  │                                                          │ │
│  │  ┌────────────────────────┐  ┌────────────────────────┐ │ │
│  │  │  Private Subnet        │  │  Private Subnet        │ │ │
│  │  │  (10.0.10.0/24)        │  │  (10.0.11.0/24)        │ │ │
│  │  │  AZ-1a                 │  │  AZ-1b                 │ │ │
│  │  ├────────────────────────┤  ├────────────────────────┤ │ │
│  │  │                        │  │                        │ │ │
│  │  │  ┌──────────────────┐  │  │  ┌──────────────────┐  │ │ │
│  │  │  │ RDS PostgreSQL   │  │  │  │ RDS PostgreSQL   │  │ │ │
│  │  │  │ (Primary)        │◄─┼──┼─►│ (Standby Replica)│  │ │ │
│  │  │  └──────────────────┘  │  │  └──────────────────┘  │ │ │
│  │  │                        │  │                        │ │ │
│  │  │  ┌──────────────────┐  │  │  ┌──────────────────┐  │ │ │
│  │  │  │ ElastiCache      │  │  │  │ ElastiCache      │  │ │ │
│  │  │  │ Redis (Primary)  │◄─┼──┼─►│ Redis (Replica)  │  │ │ │
│  │  │  └──────────────────┘  │  │  └──────────────────┘  │ │ │
│  │  └────────────────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Monitoring & Logging                                    │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  - CloudWatch Logs (centralized logging)                 │ │
│  │  - Prometheus (self-hosted on ECS/EKS)                   │ │
│  │  - Grafana (self-hosted or Grafana Cloud)                │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Kubernetes Deployment (Alternative)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Namespace: zephyr                    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Deployment: zephyr-backend (replicas: 3)       │ │ │
│  │  ├─────────────────────────────────────────────────┤ │ │
│  │  │  Pod 1       Pod 2       Pod 3                  │ │ │
│  │  │  [Backend]   [Backend]   [Backend]              │ │ │
│  │  └───────┬─────────┬─────────┬───────────────────── │ │ │
│  │          │         │         │                       │ │ │
│  │  ┌───────▼─────────▼─────────▼───────────────────┐  │ │ │
│  │  │  Service: zephyr-backend (ClusterIP)          │  │ │ │
│  │  └───────┬────────────────────────────────────────┘  │ │ │
│  │          │                                            │ │ │
│  │  ┌───────▼────────────────────────────────────────┐  │ │ │
│  │  │  Ingress: zephyr-ingress (ALB/NGINX)          │  │ │ │
│  │  │  - HTTPS/WSS termination                       │  │ │ │
│  │  │  - Sticky sessions for WebSocket               │  │ │ │
│  │  └────────────────────────────────────────────────┘  │ │ │
│  │                                                       │ │ │
│  │  ┌────────────────────────────────────────────────┐  │ │ │
│  │  │  ConfigMap: zephyr-config                      │  │ │ │
│  │  │  - Non-sensitive environment variables         │  │ │ │
│  │  └────────────────────────────────────────────────┘  │ │ │
│  │                                                       │ │ │
│  │  ┌────────────────────────────────────────────────┐  │ │ │
│  │  │  Secret: zephyr-secrets                        │  │ │ │
│  │  │  - DB_PASSWORD, REDIS_PASSWORD, etc.           │  │ │ │
│  │  └────────────────────────────────────────────────┘  │ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  External Services (managed):                              │
│  - PostgreSQL (AWS RDS / GCP Cloud SQL)                    │
│  - Redis (AWS ElastiCache / GCP Memorystore)               │
│  - Prometheus (in-cluster or managed)                      │
│  - Grafana (in-cluster or Grafana Cloud)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Application Layer

- **Runtime**: Node.js 18+ (LTS)
- **Language**: JavaScript ES6+
- **Framework**: Express 4.x
- **WebSocket**: Socket.io 4.x with Redis adapter

### Data Layer

- **Database**: PostgreSQL 14+ (relational data, ACID compliance)
- **Cache**: Redis 7+ (session store, pub/sub, rate limiting)
- **Connection Pooling**: pg (node-postgres) with 20 max connections

### Security

- **Input Validation**: Joi (schema validation)
- **XSS Protection**: xss library (sanitization)
- **Rate Limiting**: express-rate-limit + rate-limit-redis
- **Security Headers**: helmet.js (CSP, HSTS, X-Frame-Options)
- **CORS**: Whitelisted origins only
- **Authentication**: Optional JWT-based host authentication

### Monitoring & Observability

- **Metrics**: Prometheus + prom-client
- **Dashboards**: Grafana
- **Logging**: Pino (structured JSON logs)
- **Tracing**: Correlation IDs for request tracking
- **Health Checks**: /api/health, /api/health/ready, /api/health/live

### Infrastructure

- **Containers**: Docker
- **Orchestration**: Kubernetes (EKS, GKE, AKS) or Docker Compose
- **CI/CD**: GitHub Actions
- **Load Balancer**: AWS ALB / NGINX / cloud provider LB
- **Secret Management**: AWS Secrets Manager / HashiCorp Vault

---

## Scalability & Performance

### Horizontal Scaling

- **Stateless Design**: All session state in Redis, enables scaling to N instances
- **Redis Adapter**: Socket.io broadcasts events across instances via Redis pub/sub
- **Load Balancing**: Sticky sessions ensure WebSocket connections stick to same instance
- **Auto-scaling**: Scale based on CPU/memory metrics (target: 70% utilization)

### Performance Optimizations

- **Connection Pooling**: Database pool size: 20 connections per instance
- **Redis Caching**: Poll data cached for 5 minutes, invalidated on state change
- **Query Optimization**: Indexed lookups on `room_code`, `poll_id`, `participant_id`
- **WebSocket Efficiency**: Direct Redis pub/sub for broadcasting (no database round-trips)

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (P95) | <500ms | ~50ms |
| Database Query Time (P95) | <100ms | ~10ms |
| WebSocket Broadcast Latency | <100ms | <20ms |
| Concurrent Connections (per instance) | 1000+ | Tested to 500 |
| Horizontal Scale | 5x baseline | Tested to 3 instances |

---

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - VPC isolation (private subnets for database/Redis)
   - Security groups (restrict to application servers only)
   - TLS/HTTPS for all external traffic

2. **Application Layer**
   - Rate limiting (global, per-endpoint)
   - Input validation (Joi schemas)
   - XSS sanitization
   - Security headers (CSP, HSTS, X-Frame-Options)
   - CORS whitelist

3. **Data Layer**
   - Encrypted at rest (AWS RDS encryption)
   - Encrypted in transit (SSL/TLS)
   - Least privilege database user
   - Audit logging for security events

4. **Authentication & Authorization** (Optional)
   - JWT-based host authentication
   - Signed tokens with expiration
   - Configurable via `HOST_AUTH_ENABLED`

### Security Event Logging

All security-relevant events logged to `audit_logs` table:
- Rate limit violations
- Invalid input attempts
- Unauthorized actions
- Authentication failures

---

## Monitoring & Observability

### Metrics (Prometheus)

**HTTP Metrics**:
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total requests by method, route, status
- `http_errors_total` - Error count by type, route

**WebSocket Metrics**:
- `websocket_connections_current` - Active connections
- `websocket_connections_total` - Total connections since startup
- `websocket_messages_total` - Messages by direction, event type

**Database Metrics**:
- `db_query_duration_seconds` - Query latency by operation, table
- `db_queries_total` - Total queries by operation, table, status
- `db_pool_connections` - Connection pool state (idle, active)

**Business Metrics**:
- `polls_total` - Total polls created
- `polls_active` - Current active polls
- `votes_total` - Total votes submitted
- `participants_total` - Total participants joined

### Logging (Pino)

- **Format**: Structured JSON
- **Correlation IDs**: Tracked across all requests for tracing
- **Log Levels**: debug, info, warn, error
- **Aggregation**: CloudWatch Logs / Loki
- **Retention**: 30 days

### Alerting (Prometheus Alertmanager)

**Critical Alerts**:
- High error rate (>5% for 2 minutes)
- Slow database queries (P95 >100ms for 5 minutes)
- High memory usage (>90% for 5 minutes)
- Database/Redis connection failures

---

## Disaster Recovery

### Backup Strategy

- **Database Backups**: Automated RDS snapshots (daily), retained 30 days
- **Point-in-Time Recovery**: PostgreSQL PITR, restore to any second within retention
- **Redis Persistence**: AOF (Append-Only File) enabled for session recovery

### Recovery Objectives

- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 5 minutes (for database, near-zero for Redis)

### Failover Procedures

1. **Database Failover**: Automatic RDS Multi-AZ failover (<2 minutes)
2. **Redis Failover**: Automatic ElastiCache failover to replica
3. **Application Failover**: Load balancer health checks remove unhealthy instances

See [Backup Procedures](./backup-procedures.md) for detailed recovery steps.

---

## Architecture Decisions

### Why PostgreSQL?

- **ACID Compliance**: Voting data requires strong consistency (no double-counting)
- **Relational Model**: Poll → Participants → Votes maps naturally to tables with foreign keys
- **Mature Ecosystem**: Proven backups, replication, and operational tooling

### Why Redis?

- **Session Sharing**: Multi-instance WebSocket requires shared session state
- **Pub/Sub**: Socket.io Redis adapter enables real-time broadcasting across instances
- **Performance**: Low-latency cache for poll data, reduces database load

### Why Socket.io?

- **WebSocket Abstraction**: Handles fallback, reconnection, and compatibility
- **Room-based Broadcasting**: Built-in support for broadcasting to poll rooms
- **Redis Adapter**: Official adapter for multi-instance scaling

### Why Node.js?

- **Event-Driven**: Efficient for WebSocket and I/O-bound operations
- **Ecosystem**: Rich library support (Express, Socket.io, Prom-client)
- **Simplicity**: JavaScript for both frontend and backend (team efficiency)

---

## Future Enhancements

**Deferred Features** (not in v2.0.0):

- **Read Replicas**: Add when database read load exceeds capacity (FR-034 deferred)
- **Multi-Region Deployment**: For global low-latency (not current requirement)
- **Frontend Application**: React/Vue frontend (currently API-only)
- **Advanced Analytics**: Poll result analytics, participant behavior tracking

---

## Additional Resources

- [Operations Runbook](./runbook.md)
- [Backup Procedures](./backup-procedures.md)
- [Deployment Guide](../README.md#deployment)
- [Data Model](../../specs/002-production-ready/data-model.md)
- [API Contracts](../../specs/002-production-ready/contracts/)

---

**Document Maintenance**:
- Update after major architecture changes
- Review quarterly for accuracy
- Link from onboarding documentation
