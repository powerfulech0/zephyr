const { Pool } = require('pg');
const logger = require('./logger');

let pool = null;

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

  // Log connection events
  pool.on('connect', (client) => {
    logger.info({ host: config.host, database: config.database }, 'Database connection established');
  });

  pool.on('error', (err, client) => {
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
 * Query wrapper with metrics tracking (to be enhanced in US3)
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug(
      {
        duration,
        rows: result.rowCount,
        query: text.substring(0, 100), // Log first 100 chars of query
      },
      'Database query executed'
    );

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      {
        duration,
        error: error.message,
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
