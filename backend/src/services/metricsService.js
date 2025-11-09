const client = require('prom-client');
const logger = require('../config/logger');

/**
 * Metrics Service - Prometheus metrics collection
 * Implements FR-017: Metrics and monitoring
 *
 * Initializes and exports all application metrics for Prometheus scraping
 */

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (process and Node.js metrics)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

// ===========================
// HTTP Request Metrics
// ===========================

/**
 * HTTP request duration histogram
 * Tracks request latency by method, route, and status code
 */
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * HTTP request counter
 * Tracks total number of HTTP requests
 */
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ===========================
// WebSocket Metrics
// ===========================

/**
 * Current WebSocket connections gauge
 * Tracks number of active WebSocket connections
 */
const websocketConnectionsCurrent = new client.Gauge({
  name: 'websocket_connections_current',
  help: 'Current number of active WebSocket connections',
  registers: [register],
});

/**
 * Total WebSocket connections counter
 * Tracks total connections since startup
 */
const websocketConnectionsTotal = new client.Counter({
  name: 'websocket_connections_total',
  help: 'Total WebSocket connections since startup',
  registers: [register],
});

/**
 * WebSocket messages counter
 * Tracks messages by direction (inbound/outbound) and event type
 */
const websocketMessagesTotal = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages sent/received',
  labelNames: ['direction', 'event'],
  registers: [register],
});

// ===========================
// Database Metrics
// ===========================

/**
 * Database query duration histogram
 * Tracks query latency by operation and table
 */
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/**
 * Database queries counter
 * Tracks total number of queries
 */
const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

/**
 * Database connection pool gauge
 * Tracks available database connections
 */
const dbPoolSize = new client.Gauge({
  name: 'db_pool_connections',
  help: 'Current database connection pool size',
  labelNames: ['state'], // 'idle', 'active'
  registers: [register],
});

/**
 * Database connections current gauge
 * Tracks current number of active database connections
 */
const dbConnectionsCurrent = new client.Gauge({
  name: 'database_connections_current',
  help: 'Current number of database connections',
  registers: [register],
});

// ===========================
// Business Metrics
// ===========================

/**
 * Total polls created counter
 */
const pollsTotal = new client.Counter({
  name: 'polls_total',
  help: 'Total number of polls created',
  registers: [register],
});

/**
 * Active polls gauge
 */
const pollsActive = new client.Gauge({
  name: 'polls_active',
  help: 'Current number of active polls',
  registers: [register],
});

/**
 * Total votes submitted counter
 */
const votesTotal = new client.Counter({
  name: 'votes_total',
  help: 'Total number of votes submitted',
  registers: [register],
});

/**
 * Total participants counter
 */
const participantsTotal = new client.Counter({
  name: 'participants_total',
  help: 'Total number of participants who joined polls',
  registers: [register],
});

// ===========================
// Error Metrics
// ===========================

/**
 * HTTP errors counter
 * Tracks errors by type and source
 */
const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['error_type', 'route'],
  registers: [register],
});

/**
 * General errors counter
 * Tracks all application errors by type and source
 */
const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'source'], // type: client_error, server_error, database_error, timeout
  registers: [register],
});

/**
 * Rate limit exceeded counter
 * Tracks rate limit violations
 */
const rateLimitExceeded = new client.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['limit_type'], // 'global', 'poll_creation', 'vote'
  registers: [register],
});

// ===========================
// Exports
// ===========================

/**
 * Get metrics in Prometheus format
 * @returns {Promise<string>} Metrics in Prometheus text format
 */
async function getMetrics() {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to generate metrics');
    throw error;
  }
}

/**
 * Get content type for Prometheus metrics
 * @returns {string} Content-Type header value
 */
function getContentType() {
  return register.contentType;
}

module.exports = {
  register,
  getMetrics,
  getContentType,

  // HTTP metrics
  httpRequestDuration,
  httpRequestsTotal,

  // WebSocket metrics
  websocketConnectionsCurrent,
  websocketConnectionsTotal,
  websocketMessagesTotal,

  // Database metrics
  dbQueryDuration,
  dbQueriesTotal,
  dbPoolSize,
  dbConnectionsCurrent,

  // Business metrics
  pollsTotal,
  pollsActive,
  votesTotal,
  participantsTotal,

  // Error metrics
  httpErrorsTotal,
  errorsTotal,
  rateLimitExceeded,
};
