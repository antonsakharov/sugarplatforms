# Managed PostgreSQL persistence

## Scope
This increment activates a production-oriented Supabase PostgreSQL/PostgREST boundary for assessment creation/read and production workspace-membership resolution while retaining SQLite for the credential-free local/demo path.

## Configuration
Set `PERSISTENCE_PROVIDER=supabase-postgres`, `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Apply `db/migrations/001_postgres_rls.sql` followed by `db/migrations/002_supabase_jwt_rls.sql` using an administrative migration connection. Do not configure the application relational path with a service-role key.

## Security boundary
The application first verifies the Supabase access token against `/auth/v1/user`. Managed relational requests then forward that same user JWT to PostgREST. RLS policies bind `auth.uid()` to persisted membership and tenant-bearing rows. Organization/workspace identifiers are server-selected and repeated as query filters; request bodies cannot choose another tenant. The production insert policy permits only editor/admin members. Read policies require exact membership. The existing unique partial index enforces one active draft assessment per workspace at the database boundary.

## Validation
Unit/contract tests verify JWT forwarding, publishable-key use, explicit tenant filters, membership scoping, fail-closed provider behavior, and the Supabase RLS migration. Live isolation validation must use at least two authenticated users in different workspaces and confirm that neither can read/create data in the other's scope.

## Current limitation
Only assessment create/read and membership resolution are activated on this managed boundary. Processing snapshots, extraction/finding review, reports, audit/deletion, and job persistence remain on the SQLite local/single-instance repositories. Confidential production use remains blocked until those repositories are migrated and live RLS/storage isolation tests pass.
