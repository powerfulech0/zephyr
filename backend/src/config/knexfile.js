/**
 * Knex Configuration
 *
 * Database migration configuration for PostgreSQL using Knex.js
 * Supports development, test, and production environments
 *
 * Environment variables used:
 * - Development: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
 * - Test: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD (database hardcoded to zephyr_test)
 * - Production: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const path = require('path');

// Base directory is backend/ (two levels up from this file)
const baseDir = path.join(__dirname, '../..');

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    migrations: {
      directory: path.join(baseDir, 'migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(baseDir, 'seeds'),
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      database: 'zephyr_test',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    migrations: {
      directory: path.join(baseDir, 'migrations'),
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    migrations: {
      directory: path.join(baseDir, 'migrations'),
      tableName: 'knex_migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
