/**
 * Migration History Preservation Script
 *
 * Migrates historical migration records from db-migrate's `migrations` table
 * to Knex's `knex_migrations` table, ensuring zero data loss during the
 * transition from db-migrate to Knex.
 *
 * Usage:
 *   node scripts/migrate-history.js [--dry-run] [--env=<environment>]
 *
 * Options:
 *   --dry-run     Show what would be migrated without making changes
 *   --env=<env>   Environment to use (development, test, production)
 *                 Default: development
 *
 * Requirements:
 *   - PostgreSQL database must be running
 *   - db-migrate `migrations` table must exist
 *   - Knex configuration must be properly set up
 *
 * Safety:
 *   - Uses batch 0 for historical migrations (distinguishes from new migrations)
 *   - Validates migration count matches before and after
 *   - Preserves original timestamps from db-migrate
 *   - Creates placeholder migration files to satisfy Knex validation
 *   - Idempotent: safe to run multiple times (skips already migrated records)
 */

const knex = require('knex');
const knexConfig = require('../src/config/knexfile');
const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const envArg = args.find((arg) => arg.startsWith('--env='));
const environment = envArg ? envArg.split('=')[1] : 'development';

// Validate environment
if (!['development', 'test', 'production'].includes(environment)) {
  console.error(`Error: Invalid environment "${environment}"`);
  console.error('Valid environments: development, test, production');
  process.exit(1);
}

const config = knexConfig[environment];
let db;

/**
 * Main migration function
 */
async function migrateHistory() {
  console.log('='.repeat(70));
  console.log('Migration History Preservation Script');
  console.log('='.repeat(70));
  console.log(`Environment: ${environment}`);
  console.log(`Dry Run: ${isDryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Initialize database connection
    db = knex(config);
    console.log('✓ Database connection established');

    // Step 1: Check if db-migrate migrations table exists
    const hasMigrationsTable = await db.schema.hasTable('migrations');
    if (!hasMigrationsTable) {
      console.log('');
      console.log('No db-migrate migrations table found.');
      console.log('This is expected if:');
      console.log('  - This is a new installation');
      console.log('  - db-migrate was never used');
      console.log('  - Migration history was already preserved');
      console.log('');
      console.log('✓ No action needed - exiting successfully');
      return;
    }

    console.log('✓ Found db-migrate migrations table');

    // Step 2: Get historical migrations from db-migrate
    const historicalMigrations = await db('migrations')
      .select('*')
      .orderBy('run_on', 'asc');

    console.log(`✓ Found ${historicalMigrations.length} historical migration(s)`);

    if (historicalMigrations.length === 0) {
      console.log('');
      console.log('✓ No historical migrations to preserve - exiting successfully');
      return;
    }

    // Display historical migrations
    console.log('');
    console.log('Historical migrations to preserve:');
    historicalMigrations.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.name} (${migration.run_on})`);
    });
    console.log('');

    if (isDryRun) {
      console.log('DRY RUN - No changes will be made');
      console.log('');
      return;
    }

    // Step 3: Ensure knex_migrations table exists
    await db.migrate.latest(config);
    console.log('✓ Ensured knex_migrations table exists');

    // Step 4: Check for already migrated records
    const existingKnexMigrations = await db('knex_migrations')
      .where('batch', 0)
      .select('name');

    const existingNames = new Set(existingKnexMigrations.map((m) => m.name));
    console.log(`✓ Found ${existingNames.size} already preserved migration(s)`);

    // Step 5: Create placeholder migration files and insert records
    let preservedCount = 0;
    let skippedCount = 0;

    for (const migration of historicalMigrations) {
      // Convert db-migrate naming to Knex naming (add .js extension)
      const knexMigrationName = migration.name.endsWith('.js')
        ? migration.name
        : `${migration.name}.js`;

      // Skip if already migrated
      if (existingNames.has(knexMigrationName)) {
        console.log(`  ⊗ Skipped (already preserved): ${knexMigrationName}`);
        skippedCount += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      // Create placeholder migration file
      await createPlaceholderMigration(migration.name, knexMigrationName);

      // Insert into knex_migrations with batch 0 (historical marker)
      await db('knex_migrations').insert({
        name: knexMigrationName,
        batch: 0, // Batch 0 = historical/imported migration
        migration_time: migration.run_on,
      });

      console.log(`  ✓ Preserved: ${knexMigrationName}`);
      preservedCount += 1;
    }

    console.log('');
    console.log('Summary:');
    console.log(`  Total historical migrations: ${historicalMigrations.length}`);
    console.log(`  Preserved: ${preservedCount}`);
    console.log(`  Skipped (already preserved): ${skippedCount}`);
    console.log('');

    // Step 6: Validate migration count
    const knexHistoricalCount = await db('knex_migrations')
      .where('batch', 0)
      .count('* as count');

    const finalCount = parseInt(knexHistoricalCount[0].count, 10);

    console.log('Validation:');
    console.log(`  db-migrate migrations: ${historicalMigrations.length}`);
    console.log(`  knex_migrations (batch 0): ${finalCount}`);

    if (finalCount === historicalMigrations.length) {
      console.log('  ✓ Migration counts match - SUCCESS');
    } else {
      console.log('  ✗ Migration counts DO NOT match - VALIDATION FAILED');
      throw new Error(
        `Migration count mismatch: ${historicalMigrations.length} vs ${finalCount}`
      );
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('✓ Migration history preservation completed successfully');
    console.log('='.repeat(70));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify migrations with: npm run migrate:status');
    console.log('  2. Test new migrations with: npm run migrate:create test_migration');
    console.log('  3. Archive db-migrate files: mv database.json database.json.bak');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error('ERROR: Migration history preservation failed');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    process.exit(1);
  } finally {
    if (db) {
      await db.destroy();
      console.log('Database connection closed');
    }
  }
}

/**
 * Create a placeholder migration file for a historical migration
 *
 * This ensures Knex's validation doesn't fail when it finds a migration
 * record in knex_migrations without a corresponding file.
 *
 * @param {string} originalName - Original db-migrate migration name
 * @param {string} knexName - Knex migration name (with .js extension)
 */
async function createPlaceholderMigration(originalName, knexName) {
  const migrationsDir = path.join(__dirname, '../migrations');
  const filePath = path.join(migrationsDir, knexName);

  // Ensure migrations directory exists
  await fs.mkdir(migrationsDir, { recursive: true });

  // Check if file already exists
  try {
    await fs.access(filePath);
    // File exists, skip creation
    return;
  } catch (err) {
    // File doesn't exist, create it
  }

  // Create placeholder migration file
  const fileContent = `/**
 * HISTORICAL MIGRATION - DO NOT MODIFY
 *
 * This migration was originally applied via db-migrate and has been
 * imported into Knex's migration system for historical record keeping.
 *
 * Original migration: ${originalName}
 * Imported: ${new Date().toISOString()}
 *
 * IMPORTANT:
 *   - This migration has ALREADY been applied to the database
 *   - The up() function will never be called
 *   - The down() function should NOT be used (historical migrations cannot be rolled back)
 *   - This file exists only to satisfy Knex's migration file validation
 *
 * If you need to see the original migration logic, check:
 *   backend/migrations/db-migrate-archive/
 */

exports.up = function (knex) {
  // Historical migration - already applied via db-migrate
  // This function will never be called
  return Promise.resolve();
};

exports.down = function (knex) {
  // Historical migrations cannot be rolled back
  throw new Error(
    'Cannot rollback historical migration: ${originalName}. ' +
      'This migration was applied via db-migrate before the Knex migration. ' +
      'Rolling back would require manual database changes.'
  );
};
`;

  await fs.writeFile(filePath, fileContent, 'utf8');
}

// Run the migration if called directly
if (require.main === module) {
  migrateHistory()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { migrateHistory };
