/**
 * Integration tests for applying database migrations
 *
 * Tests the full workflow of applying pending migrations using Knex
 * Covers scenarios: applying migrations, already up to date
 */

const knex = require('knex');
const knexConfig = require('../../../src/config/knexfile');
const fs = require('fs');
const path = require('path');

// Use test environment configuration
const config = knexConfig.test;
let db;

describe('Apply Migrations Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Knex instance for testing
    db = knex(config);
  });

  afterAll(async () => {
    // Clean up: destroy knex instance
    if (db) {
      await db.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up migration tables before each test
    try {
      await db.schema.dropTableIfExists('migration_test');
      await db.schema.dropTableIfExists('knex_migrations_lock');
      await db.schema.dropTableIfExists('knex_migrations');
    } catch (error) {
      // Tables might not exist yet, that's okay
    }
  });

  describe('Applying Pending Migrations', () => {
    test('should apply all pending migrations successfully', async () => {
      // Run migrations
      const [batchNo, log] = await db.migrate.latest(config);

      // Verify migrations table was created
      const hasTable = await db.schema.hasTable('knex_migrations');
      expect(hasTable).toBe(true);

      // Verify batch number is assigned
      expect(batchNo).toBeGreaterThanOrEqual(0);

      // Verify migration log is returned
      expect(Array.isArray(log)).toBe(true);
    });

    test('should update knex_migrations table with applied migrations', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Query migrations table
      const migrations = await db('knex_migrations').select('*');

      // Should have at least the migration records
      expect(Array.isArray(migrations)).toBe(true);

      // Each migration should have required fields
      if (migrations.length > 0) {
        const migration = migrations[0];
        expect(migration).toHaveProperty('id');
        expect(migration).toHaveProperty('name');
        expect(migration).toHaveProperty('batch');
        expect(migration).toHaveProperty('migration_time');
      }
    });

    test('should execute migrations in correct order', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get migrations from database
      const migrations = await db('knex_migrations')
        .select('name', 'batch')
        .orderBy('id', 'asc');

      // Verify migrations are in chronological order (timestamp-based naming)
      if (migrations.length > 1) {
        for (let i = 1; i < migrations.length; i++) {
          const prevName = migrations[i - 1].name;
          const currName = migrations[i].name;
          // Migration names start with timestamps, should be in ascending order
          expect(prevName.localeCompare(currName)).toBeLessThan(0);
        }
      }
    });
  });

  describe('Already Up to Date Scenario', () => {
    test('should report "up to date" when no pending migrations exist', async () => {
      // Run migrations first time
      await db.migrate.latest(config);

      // Run migrations again (should be up to date)
      const [batchNo, log] = await db.migrate.latest(config);

      // Batch number should be the next batch (2) when already up to date
      expect(batchNo).toBeGreaterThan(0);

      // Log should be empty array (no migrations applied)
      expect(log).toEqual([]);
    });

    test('should not create duplicate migration records', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get migration count
      const firstCount = await db('knex_migrations').count('* as count');
      const count1 = parseInt(firstCount[0].count, 10);

      // Run migrations again
      await db.migrate.latest(config);

      // Get migration count again
      const secondCount = await db('knex_migrations').count('* as count');
      const count2 = parseInt(secondCount[0].count, 10);

      // Count should be the same
      expect(count2).toBe(count1);
    });
  });

  describe('Migration Lock', () => {
    test('should create migration lock table', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Verify lock table exists
      const hasLockTable = await db.schema.hasTable('knex_migrations_lock');
      expect(hasLockTable).toBe(true);
    });

    test('should release lock after migration completes', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Check lock status
      const lockStatus = await db('knex_migrations_lock')
        .select('is_locked')
        .first();

      // Lock should be released (0)
      expect(lockStatus.is_locked).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Create a config with invalid connection
      const invalidConfig = {
        ...config,
        connection: {
          ...config.connection,
          host: 'invalid-host',
          port: 99999,
        },
      };

      const invalidDb = knex(invalidConfig);

      // Attempt to run migrations should fail
      await expect(invalidDb.migrate.latest(invalidConfig)).rejects.toThrow();

      // Clean up
      await invalidDb.destroy();
    });
  });
});
