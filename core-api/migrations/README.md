# Database Migrations

This directory contains SQL migration files for the Core API database.

## How to Run Migrations

Migrations are automatically applied on server startup via `ensureSchema()` in `index.js`.
For manual migration, run:

```bash
node migrations/run.js
```

## Adding a New Migration

1. Create a new file in this directory with a timestamp prefix: `YYYYMMDD_HHMMSS_description.sql`
2. Add the SQL migration commands
3. The `run.js` script will execute all unapplied migrations in order

## Migration Tracking

Migrations are tracked in a `_migrations` table in the database.

## Current Schema

See `prisma/schema.prisma` for the current schema reference.