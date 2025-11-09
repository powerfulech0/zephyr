const { Pool } = require('pg');
const logger = require('./logger');
const {
  dbQueryDuration,
  dbQueriesTotal,
  dbConnectionsCurrent,
  errorsTotal,
} = require('../services/metricsService');
const { retryWithBackoff } = require('../services/resilienceService');
const { CircuitBreaker } = require('../utils/circuitBreaker');

let pool = null;
let dbCircuitBreaker = null;

/**
 * Extract operation type and table name from SQL query for metrics labeling
 * @param {string} sql - SQL query text
 * @returns {object} - { operation, table }
 */
function parseQueryMetadata(sql) {
  const normalizedSql = sql.trim().toUpperCase();

  // Determine operation
  let operation = 'UNKNOWN';
  if (normalizedSql.startsWith('SELECT')) operation = 'SELECT';
  else if (normalizedSql.startsWith('INSERT')) operation = 'INSERT';
  else if (normalizedSql.startsWith('UPDATE')) operation = 'UPDATE';
  else if (normalizedSql.startsWith('DELETE')) operation = 'DELETE';
  else if (normalizedSql.startsWith('TRUNCATE')) operation = 'TRUNCATE';

  // Extract table name (simplified - handles most common cases)
  let table = 'unknown';
  const tableMatch = normalizedSql.match(/(?:FROM|INTO|UPDATE|TRUNCATE)\s+(\w+)/);
  if (tableMatch) {
    table = tableMatch[1].toLowerCase();
  }

  return { operation, table };
}

/**
 * Initialize PostgreSQL connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function initializePool() {
  if (pool) {
    return pool;
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'zephyr_dev',
    user: process.env.DB_USER || 'zephyr',
    password: process.env.DB_PASSWORD || 'zephyr_dev_password',
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(config);

  // Initialize circuit breaker for database (T115)
  dbCircuitBreaker = new CircuitBreaker({
    name: 'database',
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000, // 30 seconds
    timeout: 10000, // 10 second query timeout
  });

  // Store original query method
  const originalPoolQuery = pool.query.bind(pool);

  // Override pool.query with retry + circuit breaker wrapper (T067, T113, T115)
  pool.query = async function (text, params) {
    const start = Date.now();
    const { operation, table } = parseQueryMetadata(text);

    try {
      // Wrap query with circuit breaker and retry logic (T113, T115)
      const result = await dbCircuitBreaker.execute(async () => retryWithBackoff(
          async () => originalPoolQuery(text, params),
          {
            maxAttempts: 3,
            initialDelay: 100,
            retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', '08P01', '53300'],
          }
        ));
      const duration = (Date.now() - start) / 1000;

      // Track query metrics
      dbQueryDuration.labels(operation, table).observe(duration);
      dbQueriesTotal.labels(operation, table, 'success').inc();

      logger.debug(
        {
          duration: duration * 1000,
          rows: result.rowCount,
          operation,
          table,
          query: text.substring(0, 100),
        },
        'Database query executed'
      );

      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      dbQueriesTotal.labels(operation, table, 'error').inc();
      errorsTotal.labels('database_error', 'database').inc();

      logger.error(
        {
          duration: duration * 1000,
          error: error.message,
          operation,
          table,
          query: text.substring(0, 100),
        },
        'Database query failed'
      );
      throw error;
    }
  };

  // Log connection events and track metrics (T066)
  pool.on('connect', () => {
    dbConnectionsCurrent.inc();
    logger.info({ host: config.host, database: config.database }, 'Database connection established');
  });

  pool.on('remove', () => {
    dbConnectionsCurrent.dec();
  });

  pool.on('error', (err) => {
    errorsTotal.labels('database_error', 'database').inc();
    logger.error({ err }, 'Unexpected error on idle database client');
  });

  logger.info(
    {
      host: config.host,
      port: config.port,
      database: config.database,
      maxConnections: config.max,
    },
    'PostgreSQL connection pool initialized'
  );

  return pool;
}

/**
 * Get the database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Query wrapper with metrics tracking (T066)
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  const { operation, table } = parseQueryMetadata(text);

  try {
    const result = await pool.query(text, params);
    const duration = (Date.now() - start) / 1000; // Convert to seconds for Prometheus

    // Track query metrics (T066)
    dbQueryDuration.labels(operation, table).observe(duration);
    dbQueriesTotal.labels(operation, table).inc();

    logger.debug(
      {
        duration: duration * 1000, // Log in ms for readability
        rows: result.rowCount,
        operation,
        table,
        query: text.substring(0, 100), // Log first 100 chars of query
      },
      'Database query executed'
    );

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    // Track error metrics (T066)
    errorsTotal.labels('database_error', 'database').inc();

    logger.error(
      {
        duration: duration * 1000,
        error: error.message,
        operation,
        table,
        query: text.substring(0, 100),
      },
      'Database query failed'
    );
    throw error;
  }
}

/**
 * Close database connection pool gracefully
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
    pool = null;
  }
}

module.exports = {
  initializePool,
  getPool,
  query,
  closePool,
};
