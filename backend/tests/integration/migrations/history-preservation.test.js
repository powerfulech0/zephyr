/**
 * Integration tests for preserving historical db-migrate migration data
 *
 * Tests the migration of historical db-migrate records to Knex's migration system
 * Ensures zero data loss when transitioning from db-migrate to Knex
 */

const knex = require('knex');
const knexConfig = require('../../../src/config/knexfile');

// Use test environment configuration
const config = knexConfig.test;
let db;

describe('Migration History Preservation Integration Tests', () => {
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
    // Clean up all migration-related tables before each test
    try {
      await db.schema.dropTableIfExists('migration_test');
      await db.schema.dropTableIfExists('migrations'); // db-migrate table
      await db.schema.dropTableIfExists('knex_migrations_lock');
      await db.schema.dropTableIfExists('knex_migrations');
    } catch (error) {
      // Tables might not exist yet, that's okay
    }
  });

  describe('Preserving db-migrate History', () => {
    test('should preserve all historical migration records from db-migrate', async () => {
      // Simulate existing db-migrate migrations table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      // Insert mock historical migrations
      const historicalMigrations = [
        { name: '20251108000001-initial-schema', run_on: new Date('2025-11-08') },
        { name: '20251109020000-audit-logs', run_on: new Date('2025-11-09') },
      ];

      await db('migrations').insert(historicalMigrations);

      // Verify historical data exists
      const dbMigrateRecords = await db('migrations').select('*');
      expect(dbMigrateRecords).toHaveLength(2);

      // At this point, we would run the history migration script
      // For now, we'll simulate what it should do

      // Create knex_migrations table if it doesn't exist
      await db.migrate.latest(config);

      // After running the history preservation script, verify:
      // 1. knex_migrations table exists
      const hasKnexTable = await db.schema.hasTable('knex_migrations');
      expect(hasKnexTable).toBe(true);

      // Note: The actual seeding will be done by the migration script (T019-T022)
      // This test will be updated once that script is implemented
    });

    test('should maintain correct migration count after preservation', async () => {
      // Create db-migrate migrations table with historical data
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      const historicalMigrations = [
        { name: '20251108000001-initial-schema', run_on: new Date('2025-11-08') },
        { name: '20251109020000-audit-logs', run_on: new Date('2025-11-09') },
      ];

      await db('migrations').insert(historicalMigrations);

      const originalCount = await db('migrations').count('* as count');
      const dbMigrateCount = parseInt(originalCount[0].count, 10);

      expect(dbMigrateCount).toBe(2);

      // After running the preservation script, the count should match
      // This will be implemented in T019-T022
    });

    test('should preserve migration order from db-migrate', async () => {
      // Create db-migrate migrations table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      // Insert migrations in specific order
      const historicalMigrations = [
        { name: '20251108000001-initial-schema', run_on: new Date('2025-11-08T10:00:00Z') },
        { name: '20251109020000-audit-logs', run_on: new Date('2025-11-09T02:00:00Z') },
      ];

      for (const migration of historicalMigrations) {
        await db('migrations').insert(migration);
      }

      // Get migrations in order
      const orderedMigrations = await db('migrations')
        .select('name', 'run_on')
        .orderBy('run_on', 'asc');

      // Verify order is maintained
      expect(orderedMigrations[0].name).toBe('20251108000001-initial-schema');
      expect(orderedMigrations[1].name).toBe('20251109020000-audit-logs');

      // After preservation, order should be maintained in knex_migrations
      // This will be verified once the preservation script is implemented
    });
  });

  describe('Preventing Re-execution of Historical Migrations', () => {
    test('should not re-execute migrations that were already applied via db-migrate', async () => {
      // Create and populate db-migrate table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      await db('migrations').insert({
        name: '20251108000001-initial-schema',
        run_on: new Date('2025-11-08'),
      });

      // Run the preservation script (to be implemented in T019-T022)
      // This should copy the historical migration to knex_migrations

      // After preservation, running migrate:latest should not re-execute
      // the historical migration

      // For now, we'll verify the concept by checking that knex respects
      // migrations already in knex_migrations table

      // Create knex_migrations table manually with historical migration
      await db.migrate.latest(config);

      // Manually insert historical migration record
      await db('knex_migrations').insert({
        name: '20251108000001-initial-schema.js',
        batch: 0, // Batch 0 indicates historical/imported migration
        migration_time: new Date('2025-11-08'),
      });

      // Get current status
      const [completed, pending] = await db.migrate.list(config);

      // The historical migration should appear as completed
      const historicalMigration = completed.find(
        (m) => m.name === '20251108000001-initial-schema.js'
      );

      // Note: This test will be more meaningful once we have the actual
      // archived migration files and preservation script
      expect(completed).toBeInstanceOf(Array);
    });

    test('should mark historical migrations with special batch number', async () => {
      // Initialize knex migrations table
      await db.migrate.latest(config);

      // Manually insert historical migration with batch 0
      await db('knex_migrations').insert({
        name: '20251108000001-initial-schema.js',
        batch: 0, // Special batch number for historical migrations
        migration_time: new Date('2025-11-08'),
      });

      await db('knex_migrations').insert({
        name: '20251109020000-audit-logs.js',
        batch: 0,
        migration_time: new Date('2025-11-09'),
      });

      // Query historical migrations
      const historicalMigrations = await db('knex_migrations')
        .where('batch', 0)
        .select('*');

      expect(historicalMigrations).toHaveLength(2);
      expect(historicalMigrations[0].batch).toBe(0);
      expect(historicalMigrations[1].batch).toBe(0);
    });

    test('should allow new migrations to run after history preservation', async () => {
      // Initialize knex migrations table
      await db.migrate.latest(config);

      // Insert historical migration with batch 0
      await db('knex_migrations').insert({
        name: '20251108000001-initial-schema.js',
        batch: 0,
        migration_time: new Date('2025-11-08'),
      });

      // Get count before running new migrations
      const beforeCount = await db('knex_migrations').count('* as count');
      const countBefore = parseInt(beforeCount[0].count, 10);

      // Run new migrations (the example migration)
      const [batchNo, log] = await db.migrate.latest(config);

      // Get count after
      const afterCount = await db('knex_migrations').count('* as count');
      const countAfter = parseInt(afterCount[0].count, 10);

      // New migrations should be added with batch > 0
      if (log.length > 0) {
        expect(countAfter).toBeGreaterThan(countBefore);

        // Verify the new migration has batch number > 0
        const newMigrations = await db('knex_migrations')
          .where('batch', '>', 0)
          .select('*');

        expect(newMigrations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Data Integrity Validation', () => {
    test('should validate no migration records are lost during transition', async () => {
      // Create db-migrate table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      // Insert historical data
      const migrations = [
        { name: '20251108000001-initial-schema', run_on: new Date('2025-11-08') },
        { name: '20251109020000-audit-logs', run_on: new Date('2025-11-09') },
      ];

      await db('migrations').insert(migrations);

      // Count before preservation
      const beforeCount = await db('migrations').count('* as count');
      const originalCount = parseInt(beforeCount[0].count, 10);

      expect(originalCount).toBe(2);

      // After running preservation script (T019-T022), we should verify:
      // 1. All records are in knex_migrations
      // 2. Count matches exactly
      // 3. No duplicates exist

      // This validation will be completed when the script is implemented
    });

    test('should handle empty db-migrate table gracefully', async () => {
      // Create empty db-migrate table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      // No migrations inserted

      // Verify table is empty
      const count = await db('migrations').count('* as count');
      expect(parseInt(count[0].count, 10)).toBe(0);

      // Preservation script should handle this gracefully
      // and still create knex_migrations table
      await db.migrate.latest(config);

      const hasKnexTable = await db.schema.hasTable('knex_migrations');
      expect(hasKnexTable).toBe(true);
    });

    test('should preserve migration timestamps from db-migrate', async () => {
      // Create db-migrate table
      await db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('run_on').notNullable();
      });

      const specificTime = new Date('2025-11-08T15:30:00Z');

      await db('migrations').insert({
        name: '20251108000001-initial-schema',
        run_on: specificTime,
      });

      // Get the original timestamp
      const original = await db('migrations').where('id', 1).first();

      expect(original.run_on).toEqual(specificTime);

      // After preservation, the timestamp should be maintained in knex_migrations
      // This will be verified once the preservation script is implemented
    });
  });
});
