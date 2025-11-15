# API Contracts: Modernize Database Migration System

**Feature**: 014-knex-migration
**Date**: 2025-11-15

## Overview

This feature does not introduce any new API contracts because it is a developer tooling migration (replacing db-migrate with Knex). No REST APIs, WebSocket events, or external interfaces are added or modified.

## Impact Assessment

### No Changes To:
- ✅ REST API endpoints - No API changes
- ✅ WebSocket events - No real-time communication changes
- ✅ Database schema (application tables) - Only migration metadata tables affected
- ✅ Frontend interfaces - Backend-only change
- ✅ CLI interfaces - npm script names remain the same

### Internal Changes Only:
- Migration command implementation (db-migrate → Knex)
- Migration metadata tables (migrations → knex_migrations)
- Migration configuration file (database.json → knexfile.js)

## Developer Interface Contract

While there are no API contracts, the developer interface is documented for reference:

### Migration Commands (npm scripts)

These commands maintain backward compatibility with the same names:

```bash
# Apply pending migrations
npm run migrate:up
# Previously: db-migrate up
# Now: knex migrate:latest

# Rollback last batch
npm run migrate:down
# Previously: db-migrate down
# Now: knex migrate:rollback

# Check migration status
npm run migrate:status
# Previously: db-migrate check
# Now: knex migrate:status

# Create new migration
npm run migrate:create <description>
# Previously: db-migrate create <description>
# Now: knex migrate:make <description>
```

**Contract Guarantee**: All npm script names remain unchanged. Developers use the same commands before and after this migration.

### Migration File Interface

**Input**: Developer-created migration file
**Format**: JavaScript module with exports

```javascript
// Contract: Migration file must export up() and down() functions

/**
 * Apply migration (forward)
 * @param {Knex} knex - Knex instance
 * @returns {Promise} Promise that resolves when complete
 */
exports.up = function(knex) {
  // Return a Knex schema operation
  return knex.schema.createTable('table_name', (table) => {
    // Schema definition
  });
};

/**
 * Rollback migration (backward)
 * @param {Knex} knex - Knex instance
 * @returns {Promise} Promise that resolves when complete
 */
exports.down = function(knex) {
  // Return a Knex schema operation that reverses up()
  return knex.schema.dropTableIfExists('table_name');
};
```

**Contract Rules**:
1. File must export `up` function (required)
2. File must export `down` function (required for rollback)
3. Both functions must accept `knex` parameter
4. Both functions must return a Promise
5. `down()` must reverse changes made by `up()`

### Configuration File Interface

**Input**: knexfile.js configuration
**Format**: JavaScript module exporting environment configurations

```javascript
// Contract: Must export object with environment keys

module.exports = {
  development: {
    client: 'pg',
    connection: { /* connection config */ },
    migrations: { /* migration config */ },
  },
  test: { /* test config */ },
  production: { /* production config */ },
};
```

**Contract Rules**:
1. Must export an object
2. Must include `development`, `test`, `production` keys
3. Each environment must have `client`, `connection`, `migrations` keys
4. `client` must be 'pg' (PostgreSQL)
5. `connection` must include host, port, database, user, password
6. `migrations.directory` must point to migration files
7. `migrations.tableName` must be 'knex_migrations'

## Database Schema Changes

While not API contracts, the migration system creates two metadata tables:

### knex_migrations Table

```sql
CREATE TABLE knex_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  batch INTEGER NOT NULL,
  migration_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Track which migrations have been executed

**Access**: Internal to Knex, application code does not read/write directly

### knex_migrations_lock Table

```sql
CREATE TABLE knex_migrations_lock (
  index SERIAL PRIMARY KEY,
  is_locked INTEGER DEFAULT 0
);
```

**Purpose**: Prevent concurrent migration execution

**Access**: Internal to Knex, application code does not read/write directly

## Backward Compatibility

### Maintained Compatibility

✅ npm script names (`migrate:up`, `migrate:down`, etc.)
✅ Environment variable names (POSTGRES_HOST, POSTGRES_DB, etc.)
✅ Database connection pattern (PostgreSQL via pg driver)
✅ Migration execution workflow (create → apply → rollback)

### Breaking Changes

❌ Migration configuration file format (database.json → knexfile.js)
❌ Migration file structure (db-migrate format → Knex format)
❌ Internal migration tracking tables (migrations → knex_migrations)

**Mitigation**: These are internal developer tooling changes, not user-facing breaking changes. Migration from old format to new format is handled as part of feature implementation.

## Testing Contracts

Migration system must be testable via:

1. **Unit Tests**: Test migration execution programmatically
2. **Integration Tests**: Test full migration workflow (apply, rollback, status)
3. **Contract Tests**: Verify migration file interface (up/down functions exist)

See [data-model.md](../data-model.md) for detailed testing strategy.

## Summary

**API Contracts**: None - This is internal tooling only

**Developer Interface Contracts**:
- npm script names (backward compatible)
- Migration file structure (new Knex format)
- Configuration file structure (new knexfile.js format)

**No impact on**:
- REST APIs
- WebSocket events
- Frontend code
- User-facing features
