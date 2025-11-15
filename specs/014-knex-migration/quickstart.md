# Quickstart: Knex Migration System

**Feature**: 014-knex-migration
**Last Updated**: 2025-11-15
**Prerequisites**: Node.js 18+, PostgreSQL 14+, Backend dependencies installed

## Overview

This guide walks you through using the new Knex-based database migration system. After completing this migration feature, you'll use Knex instead of db-migrate for all database schema changes.

## Quick Reference

```bash
# Apply all pending migrations
npm run migrate:up

# Rollback last batch of migrations
npm run migrate:down

# Check migration status
npm run migrate:status

# Create a new migration
npm run migrate:create <description>
```

**Note**: These commands must be run from the `backend/` directory.

## Installation & Setup

### 1. Verify Installation

After the migration feature is deployed, verify Knex is installed:

```bash
cd backend
npm list knex
# Should show: knex@<version>

npm list db-migrate
# Should show: (empty) - db-migrate removed
```

### 2. Verify Configuration

Check that knexfile.js exists:

```bash
cat src/config/knexfile.js
# Should display Knex configuration
```

### 3. Verify Database Connection

Test connection to PostgreSQL:

```bash
# Set environment variables (if not already set)
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=zephyr_dev
export POSTGRES_USER=your_user
export POSTGRES_PASSWORD=your_password

# Check migration status (will connect to database)
npm run migrate:status
```

Expected output:
```
Using environment: development
Already up to date
```

Or:
```
Using environment: development
Found X pending migrations:
  20251115143022_migration_name.js
```

## Common Workflows

### Workflow 1: Creating a New Migration

**Scenario**: You need to add a new column to the `polls` table.

**Steps**:

1. **Create migration file**:
```bash
npm run migrate:create add_description_to_polls
```

Expected output:
```
Created Migration: /path/to/backend/migrations/20251115143022_add_description_to_polls.js
```

2. **Edit migration file**:
```javascript
// migrations/20251115143022_add_description_to_polls.js

exports.up = function(knex) {
  return knex.schema.table('polls', (table) => {
    table.text('description').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('polls', (table) => {
    table.dropColumn('description');
  });
};
```

3. **Test migration locally**:
```bash
# Apply migration
npm run migrate:up

# Verify column exists
psql -d zephyr_dev -c "\d polls"

# Test rollback
npm run migrate:down

# Verify column removed
psql -d zephyr_dev -c "\d polls"

# Re-apply for development work
npm run migrate:up
```

4. **Commit migration**:
```bash
git add migrations/20251115143022_add_description_to_polls.js
git commit -m "Add description column to polls table"
```

### Workflow 2: Applying Pending Migrations

**Scenario**: You pulled changes that include new migrations.

**Steps**:

1. **Check for pending migrations**:
```bash
npm run migrate:status
```

Example output:
```
Found 2 pending migrations:
  20251115143022_add_description_to_polls.js
  20251115150130_create_votes_table.js
```

2. **Apply migrations**:
```bash
npm run migrate:up
```

Expected output:
```
Batch 5 run: 2 migrations
20251115143022_add_description_to_polls.js
20251115150130_create_votes_table.js
```

3. **Verify migrations applied**:
```bash
npm run migrate:status
```

Expected output:
```
Already up to date
```

### Workflow 3: Rolling Back a Migration

**Scenario**: A migration caused issues and needs to be rolled back.

**Steps**:

1. **Check current status**:
```bash
npm run migrate:status
```

2. **Rollback last batch**:
```bash
npm run migrate:down
```

Example output:
```
Batch 5 rolled back: 2 migrations
20251115150130_create_votes_table.js
20251115143022_add_description_to_polls.js
```

**Important**: Rollback removes ALL migrations from the most recent batch. If you applied 3 migrations in one `migrate:up` command, all 3 will rollback together.

3. **Fix the problematic migration**:
   - Edit the migration file
   - Test thoroughly

4. **Re-apply**:
```bash
npm run migrate:up
```

### Workflow 4: Checking Migration Status

**Scenario**: You want to see which migrations have been applied.

**Steps**:

```bash
npm run migrate:status
```

Example output (migrations pending):
```
Using environment: development

Found 2 pending migrations:
  20251116120000_create_participants_table.js
  20251116121500_add_index_to_room_code.js
```

Example output (up to date):
```
Using environment: development

Already up to date
```

## Environment-Specific Usage

### Development Environment

```bash
# .env file should contain:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=zephyr_dev
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password

# Run migrations
npm run migrate:up
```

### Test Environment

```bash
# Set test environment variables
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=test_user
export DB_PASSWORD=test_password
# Test database is hardcoded to zephyr_test in knexfile.js

# Run migrations
npm run migrate:up
```

### Production Environment

```bash
# Environment variables should be set in deployment config
export NODE_ENV=production
export DB_HOST=production-db-host
export DB_PORT=5432
export DB_NAME=zephyr_production
export DB_USER=prod_user
export DB_PASSWORD=<secure-password>

# Run migrations during deployment
npm run migrate:up
```

**Production Best Practices**:
1. Always backup database before running migrations
2. Test migrations in staging environment first
3. Run migrations before deploying new application code
4. Monitor migration execution for errors
5. Have rollback plan ready

## Migration Best Practices

### DO ✅

1. **Write reversible migrations**:
   - Every `up()` must have a corresponding `down()`
   - Test both directions: apply and rollback

2. **One change per migration**:
   - Add one table, or add one column, not both
   - Makes debugging easier
   - Makes rollback safer

3. **Use descriptive names**:
   - Good: `add_description_to_polls`
   - Bad: `update_polls`, `fix_schema`

4. **Test before committing**:
   ```bash
   npm run migrate:up    # Apply
   npm run migrate:down  # Rollback
   npm run migrate:up    # Re-apply
   ```

5. **Use Knex schema builder**:
   ```javascript
   // Good: Portable, safe
   exports.up = function(knex) {
     return knex.schema.createTable('polls', (table) => {
       table.uuid('id').primary();
       table.string('title', 500).notNullable();
     });
   };

   // Avoid: Raw SQL (less portable)
   exports.up = function(knex) {
     return knex.raw('CREATE TABLE polls (id UUID PRIMARY KEY, title VARCHAR(500) NOT NULL)');
   };
   ```

### DON'T ❌

1. **Modify applied migrations**:
   - Never edit migrations already applied to production
   - Create a new migration instead

2. **Mix schema and data changes**:
   - Migrations are for schema (tables, columns, indexes)
   - Use seeds for data (optional feature)

3. **Skip testing rollback**:
   - Always test `down()` function works

4. **Hardcode values**:
   ```javascript
   // Bad: Hardcoded database name
   return knex.raw('USE zephyr_dev');

   // Good: Use configuration
   return knex.schema.createTable(...);
   ```

## Troubleshooting

### Problem: "Migration table is already locked"

**Cause**: Previous migration failed without releasing lock.

**Solution**:
```sql
-- Connect to database
psql -d zephyr_dev

-- Check lock status
SELECT * FROM knex_migrations_lock;

-- Manually release lock (use with caution)
UPDATE knex_migrations_lock SET is_locked = 0;
```

**Prevention**: Knex should auto-release locks. If this happens frequently, check for:
- Database connection issues
- Long-running migrations timing out

### Problem: "Migration file not found"

**Cause**: Migration file deleted or moved.

**Solution**:
1. Check `knex_migrations` table for the migration name
2. Either restore the migration file or manually remove the entry:
```sql
DELETE FROM knex_migrations WHERE name = 'missing_migration.js';
```

**Prevention**: Don't delete migration files that have been applied.

### Problem: "Migration failed with SQL error"

**Cause**: Invalid SQL in migration.

**Solution**:
1. Check error message for details
2. Fix migration file
3. If migration partially applied, may need to manually clean up:
```sql
-- Check what was created
\dt  -- List tables
\d table_name  -- Describe table

-- Manually rollback changes if needed
DROP TABLE table_name;
```
4. Remove failed migration from history:
```sql
DELETE FROM knex_migrations WHERE name = 'failed_migration.js';
```
5. Re-apply corrected migration

**Prevention**: Test migrations thoroughly in development before deploying.

### Problem: "Cannot connect to database"

**Cause**: Database not running or incorrect credentials.

**Solution**:
```bash
# Check environment variables
echo $POSTGRES_HOST
echo $POSTGRES_PORT
echo $POSTGRES_DB
echo $POSTGRES_USER

# Test connection manually
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB

# Check PostgreSQL is running
docker ps  # If using Docker
sudo systemctl status postgresql  # If local install
```

## Knex Schema Builder Quick Reference

### Common Operations

```javascript
// Create table
exports.up = function(knex) {
  return knex.schema.createTable('table_name', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.integer('count').defaultTo(0);
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);  // created_at, updated_at
  });
};

// Drop table
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('table_name');
};

// Add column
exports.up = function(knex) {
  return knex.schema.table('table_name', (table) => {
    table.string('new_column').nullable();
  });
};

// Drop column
exports.down = function(knex) {
  return knex.schema.table('table_name', (table) => {
    table.dropColumn('new_column');
  });
};

// Add index
exports.up = function(knex) {
  return knex.schema.table('table_name', (table) => {
    table.index('column_name');
  });
};

// Drop index
exports.down = function(knex) {
  return knex.schema.table('table_name', (table) => {
    table.dropIndex('column_name');
  });
};

// Add foreign key
exports.up = function(knex) {
  return knex.schema.table('child_table', (table) => {
    table.uuid('parent_id').references('id').inTable('parent_table').onDelete('CASCADE');
  });
};

// Drop foreign key
exports.down = function(knex) {
  return knex.schema.table('child_table', (table) => {
    table.dropForeign('parent_id');
    table.dropColumn('parent_id');
  });
};
```

### Column Types

```javascript
table.uuid('id')                    // UUID
table.string('name', 255)           // VARCHAR(255)
table.text('description')           // TEXT
table.integer('count')              // INTEGER
table.bigInteger('large_number')    // BIGINT
table.boolean('active')             // BOOLEAN
table.decimal('price', 8, 2)        // DECIMAL(8,2)
table.date('birth_date')            // DATE
table.timestamp('created_at')       // TIMESTAMP
table.json('metadata')              // JSON
table.jsonb('settings')             // JSONB (PostgreSQL)
table.enum('status', ['active', 'inactive'])  // ENUM
```

### Column Modifiers

```javascript
.notNullable()        // NOT NULL
.nullable()           // NULL (default)
.defaultTo(value)     // DEFAULT value
.unsigned()           // UNSIGNED (integers)
.unique()             // UNIQUE constraint
.primary()            // PRIMARY KEY
.references('column').inTable('table')  // FOREIGN KEY
.onDelete('CASCADE')  // ON DELETE CASCADE
.onUpdate('CASCADE')  // ON UPDATE CASCADE
```

## Migration History

After migrating from db-migrate to Knex, you can view migration history:

```sql
-- View all applied migrations
SELECT * FROM knex_migrations ORDER BY id;

-- View migrations by batch
SELECT batch, COUNT(*) as count
FROM knex_migrations
GROUP BY batch
ORDER BY batch;

-- View most recent batch
SELECT * FROM knex_migrations
WHERE batch = (SELECT MAX(batch) FROM knex_migrations);
```

## Additional Resources

- [Knex.js Documentation](https://knexjs.org/)
- [Knex Migrations Guide](https://knexjs.org/guide/migrations.html)
- [Knex Schema Builder](https://knexjs.org/guide/schema-builder.html)
- Project: [research.md](./research.md) - Migration decisions and rationale
- Project: [data-model.md](./data-model.md) - Migration system data model

## Getting Help

If you encounter issues not covered in this guide:

1. Check migration logs in the console output
2. Check PostgreSQL logs for database errors
3. Review [research.md](./research.md) for migration architecture decisions
4. Consult Knex.js documentation for schema builder API
5. Check existing migrations in `backend/migrations/` for examples
