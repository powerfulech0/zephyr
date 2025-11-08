# Technical Research: Production-Ready Infrastructure

**Feature**: 002-production-ready
**Date**: 2025-11-07
**Purpose**: Resolve "NEEDS CLARIFICATION" items from Technical Context

## Research Tasks

### 1. Database Selection

**Decision**: PostgreSQL with `pg` (node-postgres) client

**Rationale**:
- **ACID Compliance**: Voting data requires strong consistency. PostgreSQL provides ACID guarantees ensuring votes aren't lost or double-counted during concurrent operations.
- **Relational Model Fit**: Poll structure (Poll → Participants → Votes) maps naturally to relational tables with foreign keys, ensuring referential integrity.
- **Query Performance**: Poll lookups by room code benefit from B-tree indexes. PostgreSQL's query planner handles JOIN operations efficiently for fetching poll + participants + votes in single query.
- **Migration Support**: Mature migration tools (db-migrate, knex, sequelize-cli) support automated, reversible schema changes required by FR-006.
- **Connection Pooling**: `pg` library has built-in connection pooling, satisfying FR-033 without additional dependencies.
- **Operational Maturity**: Well-documented backup/recovery procedures, widely supported by cloud providers (AWS RDS, GCP Cloud SQL, Azure Database).

**Alternatives Considered**:
- **MongoDB**: Document model suits nested data, but lacks multi-document ACID transactions in older versions. Eventual consistency conflicts with zero data loss requirement. Room code uniqueness enforcement requires unique indexes (same as PostgreSQL). Connection pooling less mature.
- **SQLite**: File-based simplicity attractive, but poor concurrent write performance under WebSocket load. No built-in replication for high availability. Backup requires file copy (no point-in-time recovery).
- **MySQL**: Similar to PostgreSQL, but PostgreSQL has better JSON support (useful for storing poll options array), more permissive license, and stronger community in Node.js ecosystem.

**Implementation**:
```javascript
// Connection example
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### 2. Caching Layer

**Decision**: Redis with `ioredis` client

**Rationale**:
- **Session State Sharing**: FR-030 requires session state shared across instances. Redis acts as centralized session store accessible by all backend instances.
- **Socket.io Adapter**: Official `@socket.io/redis-adapter` enables WebSocket message broadcasting across multiple instances (FR-032). Without this, participants on different instances won't see real-time updates.
- **Pub/Sub for Real-time**: Redis pub/sub channels support broadcasting vote updates, poll state changes across all instances with <10ms latency.
- **TTL Support**: Automatic expiration for session data after inactivity (configurable retention policy).
- **Atomic Operations**: INCR, HINCRBY support atomic vote counting, preventing race conditions in distributed environment.
- **Operational Simplicity**: Single additional service (vs complex distributed caches like Hazelcast). Widely supported by cloud providers (AWS ElastiCache, GCP Memorystore, Azure Cache).

**Alternatives Considered**:
- **Memcached**: Simpler than Redis, but lacks pub/sub (required for Socket.io adapter), persistence options, and atomic operations. Can't solve multi-instance WebSocket problem.
- **Database-only sessions**: Adds latency to every WebSocket event (conflicts with <100ms query target). Database not optimized for high-frequency reads/writes of ephemeral session data.
- **Sticky sessions (no cache)**: Forces all participants in same poll to same backend instance, limiting horizontal scaling effectiveness. Instance failure loses all poll sessions.

**Implementation**:
```javascript
// ioredis client
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Socket.io Redis adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

### 3. Monitoring & Observability

**Decision**: Prometheus + Grafana for metrics, Pino (existing) + centralized log aggregator

**Rationale**:
- **Cost**: Prometheus is open-source, no per-metric pricing (unlike Datadog). Grafana provides free dashboards. Reduces operational costs for startup/SMB.
- **Node.js Integration**: `prom-client` library provides Express middleware for metrics exposure. Minimal code changes to existing Pino logging.
- **Metric Types**: Supports counters (request count), gauges (active connections), histograms (response time percentiles) required by FR-017.
- **Alerting**: Prometheus Alertmanager handles alert routing, grouping, and notification (Slack, email, PagerDuty) required for critical error alerts.
- **Retention**: Configurable retention period (30 days default). Long-term storage via remote write to Thanos or Cortex if needed.
- **Self-hosted**: Can run in same infrastructure (reduces data egress costs, satisfies compliance requirements for data locality).

**Alternatives Considered**:
- **Datadog**: SaaS simplicity attractive, excellent APM and dashboards, but $15-31/host/month pricing becomes expensive at scale. Lock-in risk. Requires internet connectivity (no air-gapped deployments).
- **New Relic**: Similar pros/cons to Datadog. Good APM but expensive. Free tier limited to 100GB/month data ingestion.
- **Elastic Stack (ELK)**: Powerful for log aggregation, but metrics support less mature than Prometheus. Higher resource requirements (Elasticsearch cluster). Complex setup.
- **CloudWatch (AWS)**: Tightly integrated with AWS, but vendor lock-in. Limited metric types. Custom metrics expensive. Poor support for self-hosted deployments.

**Log Aggregation** (separate decision):
- **Loki** (Grafana Labs): Optimized for logs from Prometheus/Grafana ecosystem. Lower cost than Elasticsearch. Query language (LogQL) similar to PromQL.
- Alternatively: Cloud-specific solutions (CloudWatch Logs, Stackdriver) if deploying to single cloud provider.

**Implementation**:
```javascript
// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestDuration);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

### 4. Secret Management

**Decision**: Cloud-agnostic approach with support for multiple backends (Vault, AWS Secrets Manager, environment variables)

**Rationale**:
- **Deployment Flexibility**: Different environments may use different secret stores (AWS Secrets Manager in production, environment variables in local dev, Vault in on-premises).
- **No Vendor Lock-in**: Abstraction layer (`node-config` or custom) allows switching secret backends without code changes.
- **Local Development**: Developers use `.env` files (git-ignored). CI/CD uses cloud provider secrets. Production uses Vault or cloud KMS.
- **Gradual Migration**: Start with environment variables (simplest), migrate to Vault/cloud secrets as scale increases.

**Implementation Strategy**:
```javascript
// config/secrets.js - abstraction layer
const getSecret = async (key) => {
  if (process.env.SECRET_BACKEND === 'vault') {
    // Fetch from HashiCorp Vault
    const vault = require('node-vault')({ endpoint: process.env.VAULT_ADDR });
    const result = await vault.read(`secret/data/${key}`);
    return result.data.data.value;
  } else if (process.env.SECRET_BACKEND === 'aws') {
    // Fetch from AWS Secrets Manager
    const AWS = require('aws-sdk');
    const client = new AWS.SecretsManager({ region: process.env.AWS_REGION });
    const data = await client.getSecretValue({ SecretId: key }).promise();
    return data.SecretString;
  } else {
    // Default: environment variables
    return process.env[key];
  }
};
```

**Specific Recommendations by Environment**:
- **Local Development**: `.env` files with `dotenv` package
- **AWS Deployment**: AWS Secrets Manager (native integration, no additional service)
- **GCP Deployment**: Google Secret Manager
- **Azure Deployment**: Azure Key Vault
- **On-Premises/Multi-Cloud**: HashiCorp Vault (open-source, cloud-agnostic)

---

### 5. Input Validation & Sanitization

**Decision**: `joi` for schema validation + `xss` library for HTML sanitization

**Rationale**:
- **Declarative Schemas**: Joi provides readable, maintainable validation rules (FR-008). Example: `Joi.string().min(2).max(50).alphanum()` for nicknames.
- **Rich Validation**: Supports complex rules (email format, URL validation, conditional fields, custom validators) beyond simple regex.
- **Detailed Error Messages**: Returns structured error objects with field names, making client-side error display easier.
- **Sanitization**: `xss` library removes malicious scripts from user input (FR-007), preventing XSS attacks.
- **Middleware Integration**: Easily wraps Express routes via middleware pattern (existing pattern in codebase).

**Alternatives Considered**:
- **validator.js**: Good for simple string validation, but lacks schema composition and object validation. Would require custom logic to validate nested objects (poll with options array).
- **express-validator**: Built on validator.js, Express-specific. Less flexible than Joi for complex schemas. Harder to reuse validation logic outside Express routes (e.g., in WebSocket handlers).
- **Manual validation**: Spreads validation logic across codebase, error-prone, misses edge cases (e.g., Unicode exploits, zero-width characters in nicknames).

**Implementation**:
```javascript
const Joi = require('joi');
const xss = require('xss');

// Poll creation schema
const pollSchema = Joi.object({
  question: Joi.string().min(5).max(200).required(),
  options: Joi.array().items(
    Joi.string().min(1).max(100)
  ).min(2).max(5).required(),
});

// Validation middleware
const validatePoll = (req, res, next) => {
  const { error, value } = pollSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  // Sanitize after validation
  req.body.question = xss(value.question);
  req.body.options = value.options.map(opt => xss(opt));
  next();
};
```

---

### 6. Rate Limiting

**Decision**: `express-rate-limit` with Redis store (`rate-limit-redis`)

**Rationale**:
- **Express Integration**: Drop-in middleware for existing Express routes. Minimal code changes.
- **Distributed Rate Limiting**: `rate-limit-redis` stores rate limit counters in Redis, ensuring limits apply across all backend instances (required for FR-009).
- **Flexible Policies**: Supports per-IP limits (global), per-room limits (resource-specific), different limits for different endpoints.
- **Sliding Window**: More fair than fixed window (avoids burst at window boundaries).
- **Custom Headers**: Returns `X-RateLimit-*` headers informing clients of limits and remaining quota.

**Alternatives Considered**:
- **In-memory rate limiting** (default `express-rate-limit`): Limits only apply per instance, not globally. Attacker can bypass by hitting different instances.
- **nginx rate limiting**: Requires reverse proxy configuration. Less flexible for custom logic (e.g., different limits for authenticated users, per-room limits).
- **Custom implementation**: Complex sliding window algorithms, distributed counter synchronization. Risk of race conditions. Reinventing wheel.

**Implementation**:
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Vote submission limit: 10 votes per minute per IP
const voteLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:vote:' }),
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${req.params.roomCode}`,
  message: 'Too many vote changes, please wait before trying again.',
});

app.use('/api/', globalLimiter);
app.post('/api/polls/:roomCode/vote', voteLimiter, submitVoteHandler);
```

---

## Summary of Decisions

| Component | Decision | Primary Library | Justification |
|-----------|----------|-----------------|---------------|
| Database | PostgreSQL | `pg` (node-postgres) | ACID compliance, relational model fit, mature ecosystem |
| Caching | Redis | `ioredis` + `@socket.io/redis-adapter` | Session sharing, Socket.io multi-instance support, pub/sub |
| Metrics | Prometheus + Grafana | `prom-client` | Open-source, cost-effective, Node.js integration |
| Logging | Pino (existing) + Loki | `pino` + `pino-loki` | Existing investment, Grafana ecosystem integration |
| Secrets | Cloud-agnostic abstraction | `dotenv` + cloud SDKs or `node-vault` | Deployment flexibility, no vendor lock-in |
| Validation | Joi + XSS | `joi` + `xss` | Declarative schemas, rich validation, XSS prevention |
| Rate Limiting | Express Rate Limit + Redis | `express-rate-limit` + `rate-limit-redis` | Distributed limits, Express integration, flexible policies |
| Containers | Docker + Docker Compose | Native Docker | Industry standard, local dev parity with production |
| CI/CD | GitHub Actions | Native GitHub integration | Already using GitHub, free for public repos, yaml-based |

## Updated Dependencies

**Production Dependencies** (add to backend/package.json):
```json
{
  "pg": "^8.11.0",
  "ioredis": "^5.3.2",
  "@socket.io/redis-adapter": "^8.2.1",
  "prom-client": "^15.1.0",
  "joi": "^17.11.0",
  "xss": "^1.0.14",
  "express-rate-limit": "^7.1.5",
  "rate-limit-redis": "^4.2.0",
  "helmet": "^7.1.0"
}
```

**Development Dependencies**:
```json
{
  "pino-loki": "^2.1.3"
}
```

## Infrastructure Requirements

**Services Needed**:
1. **PostgreSQL** (version 14+)
   - Production: Managed service (AWS RDS, GCP Cloud SQL) or self-hosted cluster
   - Development: Docker container via docker-compose

2. **Redis** (version 7+)
   - Production: Managed service (AWS ElastiCache, GCP Memorystore) or self-hosted
   - Development: Docker container via docker-compose

3. **Prometheus** (version 2.45+)
   - Production: Self-hosted or managed (GCP Managed Prometheus, Grafana Cloud)
   - Development: Docker container via docker-compose

4. **Grafana** (version 10+)
   - Production: Self-hosted or Grafana Cloud
   - Development: Docker container via docker-compose

5. **Secret Store** (optional for advanced deployments)
   - Production: Cloud-native (AWS Secrets Manager, GCP Secret Manager) or Vault
   - Development: .env files

**Container Orchestration**:
- **Local**: Docker Compose (development stack)
- **Production**: Kubernetes (self-hosted or managed like EKS, GKE, AKS) OR simpler alternatives (Docker Swarm, AWS ECS, Cloud Run)

## Next Steps

All "NEEDS CLARIFICATION" items from Technical Context have been resolved. Proceed to Phase 1: Design & Contracts to define:
- Data model (database schema for PostgreSQL)
- API contracts (enhanced health check, metrics endpoint)
- Quickstart guide for local development with Docker Compose
