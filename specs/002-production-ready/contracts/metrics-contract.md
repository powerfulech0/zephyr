# Metrics API Contract - Production-Ready

**Version**: 2.0.0
**Date**: 2025-11-07
**Format**: Prometheus text-based exposition format

## Overview

Metrics endpoint exposes application and business metrics in Prometheus format (FR-017). Used by Prometheus server for scraping metrics at configured interval (default: 15 seconds).

---

## Endpoint

### `GET /metrics`

**Description**: Exposes Prometheus metrics

**Response**:
- **Status Code**: 200 OK
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Format**: Prometheus text-based exposition format

**Authentication**: None (should be restricted to internal network or require bearer token in production)

---

## Metrics Specification

### 1. HTTP Request Metrics

#### `http_request_duration_seconds`
- **Type**: Histogram
- **Description**: HTTP request duration in seconds
- **Labels**:
  - `method`: HTTP method (GET, POST, etc.)
  - `route`: Express route pattern (/api/polls, /api/health, etc.)
  - `status_code`: HTTP status code (200, 404, 500, etc.)
- **Buckets**: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

**Example**:
```
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/api/polls",status_code="201",le="0.005"} 120
http_request_duration_seconds_bucket{method="POST",route="/api/polls",status_code="201",le="0.01"} 145
http_request_duration_seconds_bucket{method="POST",route="/api/polls",status_code="201",le="0.025"} 150
http_request_duration_seconds_bucket{method="POST",route="/api/polls",status_code="201",le="+Inf"} 150
http_request_duration_seconds_sum{method="POST",route="/api/polls",status_code="201"} 1.2
http_request_duration_seconds_count{method="POST",route="/api/polls",status_code="201"} 150
```

#### `http_requests_total`
- **Type**: Counter
- **Description**: Total number of HTTP requests
- **Labels**: `method`, `route`, `status_code`

**Example**:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/api/polls",status_code="201"} 150
http_requests_total{method="GET",route="/api/polls/:roomCode",status_code="200"} 423
http_requests_total{method="GET",route="/api/polls/:roomCode",status_code="404"} 12
```

---

### 2. WebSocket Metrics

#### `websocket_connections_current`
- **Type**: Gauge
- **Description**: Current number of active WebSocket connections
- **Labels**: None

**Example**:
```
# HELP websocket_connections_current Current number of active WebSocket connections
# TYPE websocket_connections_current gauge
websocket_connections_current 42
```

#### `websocket_connections_total`
- **Type**: Counter
- **Description**: Total number of WebSocket connections since startup
- **Labels**: None

**Example**:
```
# HELP websocket_connections_total Total WebSocket connections since startup
# TYPE websocket_connections_total counter
websocket_connections_total 1523
```

#### `websocket_messages_total`
- **Type**: Counter
- **Description**: Total number of WebSocket messages sent/received
- **Labels**:
  - `direction`: `inbound` or `outbound`
  - `event`: Socket.io event type (`join-room`, `submit-vote`, `vote-update`, etc.)

**Example**:
```
# HELP websocket_messages_total Total WebSocket messages
# TYPE websocket_messages_total counter
websocket_messages_total{direction="inbound",event="join-room"} 423
websocket_messages_total{direction="inbound",event="submit-vote"} 1245
websocket_messages_total{direction="outbound",event="vote-update"} 3521
websocket_messages_total{direction="outbound",event="poll-state-changed"} 89
```

---

### 3. Business Metrics

#### `polls_total`
- **Type**: Counter
- **Description**: Total number of polls created
- **Labels**: None

**Example**:
```
# HELP polls_total Total polls created
# TYPE polls_total counter
polls_total 156
```

#### `polls_active`
- **Type**: Gauge
- **Description**: Current number of active polls (state = 'open')
- **Labels**: None

**Example**:
```
# HELP polls_active Current number of active polls
# TYPE polls_active gauge
polls_active 8
```

#### `votes_total`
- **Type**: Counter
- **Description**: Total number of votes submitted
- **Labels**: None

**Example**:
```
# HELP votes_total Total votes submitted
# TYPE votes_total counter
votes_total 2341
```

#### `participants_total`
- **Type**: Counter
- **Description**: Total number of participants joined
- **Labels**: None

**Example**:
```
# HELP participants_total Total participants joined
# TYPE participants_total counter
participants_total 1523
```

---

### 4. Database Metrics

#### `database_connections_current`
- **Type**: Gauge
- **Description**: Current number of database connections in pool
- **Labels**: None

**Example**:
```
# HELP database_connections_current Current database connections
# TYPE database_connections_current gauge
database_connections_current 12
```

#### `database_queries_total`
- **Type**: Counter
- **Description**: Total number of database queries
- **Labels**:
  - `operation`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
  - `table`: `polls`, `participants`, `votes`

**Example**:
```
# HELP database_queries_total Total database queries
# TYPE database_queries_total counter
database_queries_total{operation="INSERT",table="polls"} 156
database_queries_total{operation="SELECT",table="polls"} 1245
database_queries_total{operation="INSERT",table="votes"} 2341
```

#### `database_query_duration_seconds`
- **Type**: Histogram
- **Description**: Database query duration in seconds
- **Labels**: `operation`, `table`
- **Buckets**: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]

**Example**:
```
# HELP database_query_duration_seconds Database query duration
# TYPE database_query_duration_seconds histogram
database_query_duration_seconds_bucket{operation="SELECT",table="polls",le="0.01"} 1200
database_query_duration_seconds_bucket{operation="SELECT",table="polls",le="0.025"} 1240
database_query_duration_seconds_bucket{operation="SELECT",table="polls",le="+Inf"} 1245
database_query_duration_seconds_sum{operation="SELECT",table="polls"} 8.5
database_query_duration_seconds_count{operation="SELECT",table="polls"} 1245
```

---

### 5. Rate Limiting Metrics

#### `rate_limit_exceeded_total`
- **Type**: Counter
- **Description**: Total number of requests rejected due to rate limiting
- **Labels**:
  - `limiter`: `global`, `vote`, `poll_creation`

**Example**:
```
# HELP rate_limit_exceeded_total Rate limit rejections
# TYPE rate_limit_exceeded_total counter
rate_limit_exceeded_total{limiter="global"} 45
rate_limit_exceeded_total{limiter="vote"} 23
```

---

### 6. Error Metrics

#### `errors_total`
- **Type**: Counter
- **Description**: Total number of errors
- **Labels**:
  - `type`: `client_error` (4xx), `server_error` (5xx), `database_error`, `timeout`
  - `source`: `http`, `websocket`, `database`, `redis`

**Example**:
```
# HELP errors_total Total errors
# TYPE errors_total counter
errors_total{type="client_error",source="http"} 67
errors_total{type="server_error",source="http"} 3
errors_total{type="database_error",source="database"} 1
errors_total{type="timeout",source="redis"} 2
```

---

### 7. System Metrics (Node.js)

#### `nodejs_heap_size_used_bytes`
- **Type**: Gauge
- **Description**: V8 heap memory used
- **Labels**: None

#### `nodejs_heap_size_total_bytes`
- **Type**: Gauge
- **Description**: V8 heap memory total
- **Labels**: None

#### `nodejs_eventloop_lag_seconds`
- **Type**: Gauge
- **Description**: Event loop lag in seconds
- **Labels**: None

**Example**:
```
# HELP nodejs_heap_size_used_bytes V8 heap memory used
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 45678912

# HELP nodejs_heap_size_total_bytes V8 heap memory total
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 67108864

# HELP nodejs_eventloop_lag_seconds Event loop lag
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.003
```

---

## Implementation Notes

### Instrumentation Points

**HTTP Middleware** (Express):
```javascript
const promClient = require('prom-client');

// Record HTTP request duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route.path, res.statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, req.route.path, res.statusCode).inc();
  });
  next();
});
```

**WebSocket Event Handlers**:
```javascript
// Track connection
io.on('connection', (socket) => {
  websocketConnectionsCurrent.inc();
  websocketConnectionsTotal.inc();

  socket.on('disconnect', () => {
    websocketConnectionsCurrent.dec();
  });

  socket.on('submit-vote', (data) => {
    websocketMessagesTotal.labels('inbound', 'submit-vote').inc();
    // ... handle vote
    websocketMessagesTotal.labels('outbound', 'vote-update').inc(numBroadcasts);
  });
});
```

**Database Query Wrapper**:
```javascript
const queryWithMetrics = async (operation, table, query, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(query, params);
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.labels(operation, table).observe(duration);
    databaseQueriesTotal.labels(operation, table).inc();
    return result;
  } catch (error) {
    errorsTotal.labels('database_error', 'database').inc();
    throw error;
  }
};
```

---

## Prometheus Configuration

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s # Scrape every 15 seconds
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'zephyr-backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'
```

---

## Grafana Dashboard Queries

### Request Rate (RPS)
```promql
rate(http_requests_total[1m])
```

### Error Rate
```promql
rate(errors_total{type="server_error"}[5m])
```

### P95 Response Time
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Active WebSocket Connections
```promql
websocket_connections_current
```

### Database P95 Query Time
```promql
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
```

---

## Alerts

**Example Prometheus Alerts**:
```yaml
groups:
  - name: zephyr_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total{type="server_error"}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "High server error rate: {{ $value }}/s"

      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        annotations:
          summary: "P95 database query time above 100ms: {{ $value }}s"

      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        annotations:
          summary: "Memory usage above 90%: {{ $value }}"
```

---

## Validation Against Requirements

- **FR-017**: ✅ Metrics exposed for request count, error rate, response time, active connections
- **FR-019**: ✅ Error rates tracked and categorized (client, server, database, timeout)
- **SC-006**: ✅ Active WebSocket connections tracked (10,000 target)
- **SC-007**: ✅ Database query response time tracked (P95 <100ms target)

---

## Security Considerations

- **Access Control**: Metrics endpoint should be restricted to internal network or require authentication in production
- **Sensitive Data**: Never expose user data (nicknames, room codes, questions) in metric labels
- **Cardinality**: Avoid high-cardinality labels (e.g., room_code, participant_id) - use aggregated metrics instead
