# Data Model: Modernize Database Migration System

**Feature**: 014-knex-migration
**Date**: 2025-11-15
**Related**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data structures used by the Knex migration system. Since this is a migration tooling feature (not a user-facing feature), the data model focuses on migration metadata and history tracking.

## Core Entities

### 1. Migration History Entry (knex_migrations table)

**Purpose**: Track which migrations have been executed and when.

**Managed By**: Knex migration system (auto-created and maintained)

**Schema** (PostgreSQL):
```sql
CREATE TABLE knex_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  batch INTEGER NOT NULL,
  migration_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Unique identifier for each migration execution record
- `name`: Migration file name (e.g., "20231115120000_create_polls_table.js")
- `batch`: Batch number - groups migrations executed together in a single `migrate:up` run
- `migration_time`: Timestamp when migration was applied

**Relationships**:
- No foreign keys - this is a standalone metadata table
- Related to migration files in `backend/migrations/` directory by name

**Validation Rules**:
- `name` must be unique (cannot execute same migration twice)
- `batch` must be positive integer
- `migration_time` automatically set to current timestamp on insertion

**State Transitions**:
- **Created**: When migration is applied via `knex migrate:latest`
- **Deleted**: When migration is rolled back via `knex migrate:rollback` (removes all entries from most recent batch)

**Notes**:
- Knex automatically manages this table - application code does not write to it directly
- Batch numbers increment sequentially (1, 2, 3, ...)
- Rollback removes all migrations from the highest batch number

### 2. Migration Lock (knex_migrations_lock table)

**Purpose**: Prevent concurrent migration execution across multiple processes/instances.

**Managed By**: Knex migration system (auto-created and maintained)

**Schema** (PostgreSQL):
```sql
CREATE TABLE knex_migrations_lock (
  index SERIAL PRIMARY KEY,
  is_locked INTEGER DEFAULT 0
);

-- Always contains exactly one row
INSERT INTO knex_migrations_lock (is_locked) VALUES (0);
```

**Fields**:
- `index`: Primary key (always 1 - table contains exactly one row)
- `is_locked`: Lock status (0 = unlocked, 1 = locked)

**Validation Rules**:
- Table must contain exactly one row
- `is_locked` must be 0 or 1

**State Transitions**:
- **Unlocked (0)**: Default state, migrations can be executed
- **Locked (1)**: Migration in progress, other processes must wait
- Lock is acquired at migration start, released at completion/failure

**Notes**:
- Prevents race conditions when multiple deployment processes attempt to run migrations
- Critical for production environments with multiple instances
- Lock is automatically released if migration fails

### 3. Migration Definition File

**Purpose**: Define database schema changes in JavaScript code.

**Managed By**: Developers (created manually or via `npm run migrate:create`)

**Format**: JavaScript module with `up()` and `down()` functions

**Example Structure**:
```javascript
/**
 * Migration: Create polls table
 * Created: 2025-11-15
 */

exports.up = function(knex) {
  return knex.schema.createTable('polls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 500).notNullable();
    table.string('room_code', 6).notNullable().unique();
    table.enum('state', ['waiting', 'open', 'closed']).defaultTo('waiting');
    table.timestamps(true, true); // created_at, updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('polls');
};
```

**Validation Rules**:
- File name must follow pattern: `YYYYMMDDHHMMSS_description.js`
- Must export `up` function (required)
- Must export `down` function (required for rollback support)
- Both functions must return a Promise (Knex query builder returns Promises)
- Changes in `down()` must reverse changes in `up()`

**File Naming Convention**:
- Timestamp prefix: `YYYYMMDDHHMMSS` (20 digits) ensures chronological ordering
- Description: Snake_case description of the change (e.g., `create_polls_table`)
- Extension: `.js`
- Example: `20251115143022_add_poll_description_column.js`

**Notes**:
- Files are executed in alphabetical order (timestamp ensures chronological)
- Knex automatically generates timestamp when using `migrate:make` command
- Use Knex schema builder API for portability across databases

## Configuration Entity

### Knex Configuration Object (knexfile.js)

**Purpose**: Define database connection and migration settings per environment.

**Location**: `backend/src/config/knexfile.js`

**Structure**:
```javascript
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
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds', // Optional: for test data
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: 'zephyr_test',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    migrations: {
      directory: './migrations',
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
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
```

**Configuration Keys**:
- `client`: Database driver ('pg' for PostgreSQL)
- `connection`: Database connection parameters
- `migrations.directory`: Path to migration files
- `migrations.tableName`: Name of migration history table
- `pool`: Connection pool settings (production only)

## Migration History Preservation

### Historical Migration Mapping

**Purpose**: Preserve execution history from db-migrate when transitioning to Knex.

**Approach**: One-time data migration to seed `knex_migrations` table with historical data.

**Mapping Strategy**:

1. **Query existing db-migrate history**:
```sql
SELECT id, name, run_on FROM migrations ORDER BY run_on;
```

2. **Transform to Knex format**:
```javascript
// Pseudo-code for mapping
db_migrate_history.forEach((migration, index) => {
  knex_migrations.insert({
    name: migration.name,           // Keep original migration name
    batch: index + 1,                // Assign sequential batch numbers
    migration_time: migration.run_on // Preserve original timestamp
  });
});
```

3. **Validation**:
- Count of entries in `migrations` table must equal count in `knex_migrations` table
- All migration names must be present in both tables
- Chronological order must be preserved

**Notes**:
- This is a one-time operation during the migration from db-migrate to Knex
- After migration, db-migrate `migrations` table can be dropped (archive first)
- Document the mapping in migration comments for audit trail

## Entity Relationships

```
┌─────────────────────────────┐
│ knex_migrations_lock        │
│ (Singleton - 1 row)         │
├─────────────────────────────┤
│ index: 1                    │
│ is_locked: 0 or 1           │
└─────────────────────────────┘
           │
           │ Controls access to
           ▼
┌─────────────────────────────┐
│ knex_migrations             │
│ (Migration History)         │
├─────────────────────────────┤
│ id: serial                  │
│ name: varchar(255)          │
│ batch: integer              │
│ migration_time: timestamptz │
└─────────────────────────────┘
           │
           │ References (by name)
           ▼
┌─────────────────────────────┐
│ Migration Files             │
│ (backend/migrations/*.js)   │
├─────────────────────────────┤
│ Filename pattern:           │
│ YYYYMMDDHHMMSS_desc.js      │
│                             │
│ Exports:                    │
│ - up(knex)                  │
│ - down(knex)                │
└─────────────────────────────┘
```

## Data Lifecycle

### Migration Execution Flow

1. **Developer creates migration**:
   - `npm run migrate:create add_feature`
   - Generates file: `20251115143022_add_feature.js`
   - Developer implements `up()` and `down()` functions

2. **Migration applied to database**:
   - `npm run migrate:up` (or `knex migrate:latest`)
   - Knex acquires lock (sets `is_locked = 1` in `knex_migrations_lock`)
   - Knex checks `knex_migrations` to find pending migrations
   - Executes pending migrations in order
   - Inserts entry into `knex_migrations` for each executed migration
   - Releases lock (sets `is_locked = 0`)

3. **Migration rollback** (if needed):
   - `npm run migrate:down` (or `knex migrate:rollback`)
   - Knex acquires lock
   - Finds highest batch number in `knex_migrations`
   - Executes `down()` for all migrations in that batch (reverse order)
   - Deletes entries from `knex_migrations` for rolled back migrations
   - Releases lock

### Data Persistence

- **Migration History**: Persisted indefinitely in `knex_migrations` table
- **Migration Lock**: Persisted but updated frequently (lock/unlock)
- **Migration Files**: Version controlled in Git, deployed with application code

## Schema Evolution Strategy

### Adding New Migrations

1. Create migration file via `npm run migrate:create <description>`
2. Implement `up()` function with schema changes
3. Implement `down()` function with reverse changes
4. Test migration: apply, verify, rollback, verify
5. Commit migration file to Git
6. Deploy and run migrations in each environment (dev → staging → production)

### Modifying Existing Migrations

**Rule**: NEVER modify migrations that have been applied to production.

**If you need to change applied migrations**:
1. Create a NEW migration that makes the additional changes
2. Document why the change was needed in migration comments

**Why**: Changing applied migrations causes schema drift between environments and breaks rollback capability.

## Performance Considerations

- **Migration Execution**: Typically fast (<1 second per migration for DDL)
- **Lock Contention**: Minimal - migrations are infrequent operations
- **Transaction Overhead**: PostgreSQL DDL in transactions is efficient
- **Batch Size**: Not a concern - migrations execute sequentially, not in bulk

## Security Considerations

- **Database Credentials**: Loaded from environment variables, never hardcoded
- **Migration File Access**: Developers with code access can create migrations (intentional)
- **SQL Injection**: Not applicable - migrations use Knex schema builder API, not raw SQL
- **Lock Table**: Prevents accidental concurrent migrations, not a security control

## Testing Strategy

### Test Data

For migration tests, use a test database with:
1. Empty database (fresh migration test)
2. Database with historical db-migrate entries (migration history preservation test)
3. Database with existing schema (idempotency test)

### Validation Queries

```sql
-- Verify migration was applied
SELECT * FROM knex_migrations WHERE name = '20251115143022_migration_name.js';

-- Verify schema change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'table_name';

-- Verify migration lock is released
SELECT is_locked FROM knex_migrations_lock;
```

## Appendix: Comparison with db-migrate

| Aspect | db-migrate | Knex |
|--------|-----------|------|
| History Table | `migrations` | `knex_migrations` |
| Lock Table | None | `knex_migrations_lock` |
| Batch Tracking | No | Yes (enables batch rollback) |
| Config File | database.json | knexfile.js |
| Up Command | `db-migrate up` | `knex migrate:latest` |
| Down Command | `db-migrate down` | `knex migrate:rollback` |
| Status Command | `db-migrate check` | `knex migrate:status` |
| Create Command | `db-migrate create <name>` | `knex migrate:make <name>` |

**Migration Impact**: Tables are different, so both can coexist during transition. Historical `migrations` table data will be migrated to `knex_migrations` table.
