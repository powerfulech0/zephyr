# Research: Modernize Database Migration System

**Feature**: 014-knex-migration
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document captures research findings and technical decisions for migrating from db-migrate to Knex.js for database schema migrations.

## Key Decisions

### Decision 1: Migration Tool Selection - Knex.js

**Context**: Need to replace db-migrate with a more modern, actively maintained migration tool.

**Decision**: Use Knex.js as the new migration system.

**Rationale**:
- **Active Maintenance**: Knex is actively maintained with regular releases and security updates
- **Wide Adoption**: Large community, extensive documentation, proven in production environments
- **PostgreSQL Support**: First-class PostgreSQL support with the pg driver (already in use)
- **Migration Features**: Supports both up/down migrations, transaction wrapping, migration locking
- **Query Builder Bonus**: While we only need migrations now, Knex provides a query builder if needed later
- **Configuration Flexibility**: Supports environment-specific configurations via knexfile.js
- **Migration API**: Programmatic migration API allows testing and custom tooling

**Alternatives Considered**:
1. **node-pg-migrate**
   - Pros: Lightweight, PostgreSQL-specific, good migration DSL
   - Cons: Smaller community, less flexible for future needs, no query builder
   - Rejected because: Knex provides migration features plus future flexibility

2. **Sequelize Migrations**
   - Pros: Part of popular ORM, good TypeScript support
   - Cons: Requires full Sequelize ORM adoption, heavier weight
   - Rejected because: Too heavy for migration-only use case, violates simplicity principle

3. **TypeORM Migrations**
   - Pros: TypeScript-first, decorator-based
   - Cons: Requires TypeScript, full ORM adoption
   - Rejected because: Project uses JavaScript, not TypeScript; ORM overhead not needed

4. **Raw SQL Migration Framework (custom)**
   - Pros: Maximum simplicity, no dependencies
   - Cons: Need to build migration tracking, locking, rollback logic
   - Rejected because: Reinventing the wheel, Knex provides all this battle-tested

### Decision 2: Configuration Strategy

**Context**: Need to configure Knex to connect to PostgreSQL with environment-specific settings.

**Decision**: Create `backend/src/config/knexfile.js` with environment configurations matching existing database.json pattern.

**Rationale**:
- **Consistency**: Follows existing pattern of config files in src/config/ directory
- **Environment Variables**: Uses existing env var names (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, etc.)
- **Multiple Environments**: Supports dev, test, production configurations
- **CLI Compatibility**: knexfile.js is the standard config file that Knex CLI expects

**Configuration Structure**:
```javascript
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },
  // Similar for test and production
};
```

### Decision 3: Migration History Preservation Strategy

**Context**: Existing db-migrate migrations have been applied. Need to prevent re-execution while preserving history.

**Decision**: Manual migration history seeding approach.

**Rationale**:
- **Clean Slate**: db-migrate uses `migrations` table, Knex uses `knex_migrations` table - no conflict
- **One-Time Operation**: Migration from db-migrate to Knex is a one-time event
- **Explicit Control**: Manual seeding gives us explicit control over migration history mapping
- **Documentation**: Clear audit trail of what was migrated when

**Approach**:
1. Check existing db-migrate migrations table to identify applied migrations
2. Create equivalent entries in knex_migrations table for historical migrations
3. Future migrations use Knex exclusively
4. Document the migration mapping in migration comments

**Alternatives Considered**:
1. **Automatic Migration Detection**
   - Pros: Fully automated
   - Cons: Complex logic, potential for errors, hard to audit
   - Rejected because: One-time operation doesn't justify complexity

2. **Recreate Migrations in Knex Format**
   - Pros: All migrations in same format
   - Cons: Risky - might introduce schema drift, time-consuming
   - Rejected because: Don't modify working migrations, preserve history as-is

### Decision 4: Package.json Scripts Strategy

**Context**: Need to replace npm scripts (migrate:up, migrate:down, migrate:status, migrate:create) with Knex equivalents.

**Decision**: Replace scripts with Knex CLI commands while maintaining same script names.

**Rationale**:
- **Backward Compatibility**: Developers use the same npm commands (migrate:up, etc.)
- **Zero Retraining**: No need to learn new command syntax
- **CI/CD Compatibility**: Existing deployment pipelines continue to work
- **Documentation Continuity**: Existing docs remain valid with minimal updates

**Script Mappings**:
```json
{
  "scripts": {
    "migrate:up": "knex migrate:latest --knexfile=src/config/knexfile.js",
    "migrate:down": "knex migrate:rollback --knexfile=src/config/knexfile.js",
    "migrate:status": "knex migrate:status --knexfile=src/config/knexfile.js",
    "migrate:create": "knex migrate:make --knexfile=src/config/knexfile.js"
  }
}
```

### Decision 5: Migration File Location

**Context**: Need to decide where to store Knex migration files.

**Decision**: Create `backend/migrations/` directory at the root of the backend package.

**Rationale**:
- **Convention**: Knex convention is to have migrations at project root
- **Visibility**: Migration files are first-class artifacts, should be prominent
- **Separation**: Keep migrations separate from application source code (src/)
- **CLI Compatibility**: Standard location works well with Knex CLI tools

**Alternatives Considered**:
1. **backend/src/migrations/**
   - Pros: Co-located with source code
   - Cons: Migrations are data definitions, not application logic
   - Rejected because: Migrations are infrastructure, not application code

2. **backend/db/migrations/**
   - Pros: Groups all database-related files
   - Cons: Extra nesting, non-standard for Knex
   - Rejected because: Unnecessary nesting, migrations directory is self-explanatory

### Decision 6: Testing Strategy

**Context**: Need to test migration system functionality.

**Decision**: Unit tests for migration execution, integration tests for rollback scenarios.

**Rationale**:
- **TDD Compliance**: Tests must be written before implementation (Constitution Principle IV)
- **Critical Functionality**: Migrations affect data integrity, must be tested
- **Test Database**: Use test database environment for safe testing

**Test Coverage**:
1. **Unit Tests**:
   - Knex configuration loads correctly
   - Migration directory is accessible
   - Connection to test database succeeds

2. **Integration Tests**:
   - Apply pending migrations successfully
   - Rollback migrations successfully
   - Migration status reporting works
   - Migration creation generates valid files
   - Historical migration entries are preserved

### Decision 7: Dependency Management

**Context**: Need to add Knex, remove db-migrate.

**Decision**:
- Add `knex` to devDependencies (migration tooling, not runtime dependency)
- Remove `db-migrate` and `db-migrate-pg` from devDependencies
- Keep `pg` in dependencies (already present, used by application)

**Rationale**:
- **Dev Dependency**: Migrations are development/deployment tooling, not runtime code
- **Minimal Changes**: Only swap migration tools, keep PostgreSQL driver unchanged
- **Clean Dependencies**: Remove deprecated tools to avoid confusion

## Migration Risks & Mitigations

### Risk 1: Data Loss During Migration

**Likelihood**: Low
**Impact**: Critical

**Mitigation**:
- Test migration process thoroughly in development environment first
- Create database backup before production migration
- Verify migration history preservation before declaring success
- Document rollback procedure

### Risk 2: Migration History Mismatch

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Create script to verify db-migrate history matches Knex history after seeding
- Document exact mapping of db-migrate migrations to Knex migrations
- Test on staging environment before production

### Risk 3: CI/CD Pipeline Breakage

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Maintain same npm script names (migrate:up, migrate:down)
- Test CI pipeline changes in feature branch before merge
- Document any required CI/CD configuration changes

### Risk 4: Developer Workflow Disruption

**Likelihood**: Low
**Impact**: Low

**Mitigation**:
- Update documentation with new migration creation workflow
- Maintain familiar npm script interface
- Provide migration guide in quickstart.md

## Best Practices Research

### Knex Migration Best Practices

1. **Always Use Transactions**: Knex wraps migrations in transactions by default - keep this enabled
2. **Write Reversible Migrations**: Every up() must have a corresponding down()
3. **Timestamp-Based Naming**: Knex uses timestamp prefixes automatically
4. **Single Responsibility**: One migration per schema change
5. **Test Migrations**: Apply and rollback in development before committing
6. **No Data in Migrations**: Schema only - use seeds for data

### PostgreSQL-Specific Considerations

1. **Schema Locking**: Knex uses a migration lock table (knex_migrations_lock) to prevent concurrent migrations
2. **Connection Pooling**: Reuse existing pool configuration from application
3. **Transaction Isolation**: Default READ COMMITTED is appropriate for migrations
4. **DDL in Transactions**: PostgreSQL supports DDL in transactions (unlike MySQL) - leverage this

## Implementation Notes

### Migration Execution Order

1. Install Knex dependency
2. Create knexfile.js configuration
3. Create migrations/ directory
4. Update package.json scripts
5. Seed migration history table
6. Test migration execution
7. Update documentation
8. Remove db-migrate dependencies

### Rollback Plan

If migration to Knex fails:
1. Revert package.json changes
2. Reinstall db-migrate
3. Remove Knex-specific files (knexfile.js, migrations/)
4. Clean up knex_migrations tables if created
5. Resume using db-migrate

## References

- [Knex.js Documentation](https://knexjs.org/)
- [Knex Migrations Guide](https://knexjs.org/guide/migrations.html)
- [PostgreSQL pg Driver Documentation](https://node-postgres.com/)
- Existing codebase: backend/database.json, backend/package.json
