/**
 * Integration tests for migration status reporting
 *
 * Tests the ability to check which migrations are applied and which are pending
 */

const knex = require('knex');
const knexConfig = require('../../../src/config/knexfile');

// Use test environment configuration
const config = knexConfig.test;
let db;

describe('Migration Status Integration Tests', () => {
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

  describe('Status Reporting', () => {
    test('should return list of applied and pending migrations', async () => {
      // Get current migration status
      const [completed, pending] = await db.migrate.list(config);

      // Completed and pending should be arrays
      expect(Array.isArray(completed)).toBe(true);
      expect(Array.isArray(pending)).toBe(true);
    });

    test('should show all migrations as pending before running migrations', async () => {
      // Get status before running migrations
      const [completed, pending] = await db.migrate.list(config);

      // No migrations should be completed
      expect(completed).toHaveLength(0);

      // All migrations should be pending (if any exist)
      // This depends on whether migration files exist
      expect(Array.isArray(pending)).toBe(true);
    });

    test('should show migrations as completed after applying them', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get status after running migrations
      const [completed, pending] = await db.migrate.list(config);

      // Pending should be empty
      expect(pending).toHaveLength(0);

      // Completed should contain applied migrations
      // Each completed migration should have a name property
      completed.forEach((migration) => {
        expect(migration).toHaveProperty('name');
        expect(migration.name.length).toBeGreaterThan(0);
      });
    });

    test('should correctly differentiate between applied and pending migrations', async () => {
      // Get initial status
      const [initialCompleted, initialPending] = await db.migrate.list(config);
      const initialPendingCount = initialPending.length;

      // Run migrations
      await db.migrate.latest(config);

      // Get final status
      const [finalCompleted, finalPending] = await db.migrate.list(config);

      // All initially pending migrations should now be completed
      expect(finalCompleted.length).toBe(initialPendingCount);
      expect(finalPending.length).toBe(0);
    });
  });

  describe('Migration Details', () => {
    test('should provide migration names in status', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get status
      const [completed] = await db.migrate.list(config);

      // Each migration should have a filename
      if (completed.length > 0) {
        completed.forEach((migration) => {
          expect(migration).toHaveProperty('name');
          expect(typeof migration.name).toBe('string');
          // Migration names should end with .js
          expect(migration.name.endsWith('.js')).toBe(true);
        });
      }
    });

    test('should maintain consistent status across multiple checks', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get status first time
      const migrations1 = await db.migrate.list(config);

      // Get status second time
      const migrations2 = await db.migrate.list(config);

      // Status should be the same
      expect(migrations1).toEqual(migrations2);
    });
  });

  describe('Status Before Migration Tables Exist', () => {
    test('should handle status check when migration tables do not exist', async () => {
      // Ensure migration tables don't exist
      await db.schema.dropTableIfExists('knex_migrations');
      await db.schema.dropTableIfExists('knex_migrations_lock');

      // Getting status should work (and create tables if needed)
      const [completed, pending] = await db.migrate.list(config);

      // Should return empty completed list before migrations run
      expect(Array.isArray(completed)).toBe(true);
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe('Current Version', () => {
    test('should return current migration version', async () => {
      // Run migrations
      await db.migrate.latest(config);

      // Get current version
      const version = await db.migrate.currentVersion(config);

      // Version should be a string
      expect(typeof version).toBe('string');

      // Version should be "none" if no migrations, or a migration name if migrations exist
      expect(version.length).toBeGreaterThan(0);
    });

    test('should return "none" before any migrations are applied', async () => {
      // Get version before running migrations
      const version = await db.migrate.currentVersion(config);

      // Version should be "none" when no migrations applied
      expect(version).toBe('none');
    });
  });
});
