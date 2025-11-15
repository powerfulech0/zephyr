/**
 * Unit tests for Knex configuration
 *
 * Tests that knexfile.js loads correctly and contains required configuration
 * for all environments (development, test, production)
 */

const knexConfig = require('../../../src/config/knexfile');

describe('Knex Configuration', () => {
  describe('Configuration Structure', () => {
    test('should export configuration object', () => {
      expect(knexConfig).toBeDefined();
      expect(typeof knexConfig).toBe('object');
    });

    test('should have development environment configuration', () => {
      expect(knexConfig.development).toBeDefined();
      expect(knexConfig.development.client).toBe('pg');
      expect(knexConfig.development.connection).toBeDefined();
      expect(knexConfig.development.migrations).toBeDefined();
    });

    test('should have test environment configuration', () => {
      expect(knexConfig.test).toBeDefined();
      expect(knexConfig.test.client).toBe('pg');
      expect(knexConfig.test.connection).toBeDefined();
      expect(knexConfig.test.migrations).toBeDefined();
    });

    test('should have production environment configuration', () => {
      expect(knexConfig.production).toBeDefined();
      expect(knexConfig.production.client).toBe('pg');
      expect(knexConfig.production.connection).toBeDefined();
      expect(knexConfig.production.migrations).toBeDefined();
      expect(knexConfig.production.pool).toBeDefined();
    });
  });

  describe('Development Environment', () => {
    test('should use PostgreSQL client', () => {
      expect(knexConfig.development.client).toBe('pg');
    });

    test('should have connection configuration', () => {
      const { connection } = knexConfig.development;
      expect(connection).toBeDefined();
      expect(connection.host).toBeDefined();
      expect(connection.port).toBeDefined();
    });

    test('should have migrations configuration', () => {
      const { migrations } = knexConfig.development;
      expect(migrations.directory).toBe('./migrations');
      expect(migrations.tableName).toBe('knex_migrations');
    });
  });

  describe('Test Environment', () => {
    test('should use test database', () => {
      expect(knexConfig.test.connection.database).toBe('zephyr_test');
    });

    test('should have migrations table name', () => {
      expect(knexConfig.test.migrations.tableName).toBe('knex_migrations');
    });
  });

  describe('Production Environment', () => {
    test('should have connection pool configuration', () => {
      const { pool } = knexConfig.production;
      expect(pool).toBeDefined();
      expect(pool.min).toBeDefined();
      expect(pool.max).toBeDefined();
      expect(pool.min).toBeLessThanOrEqual(pool.max);
    });

    test('should use environment variables for connection', () => {
      const { connection } = knexConfig.production;
      expect(connection.host).toBeDefined();
      expect(connection.port).toBeDefined();
    });
  });
});
