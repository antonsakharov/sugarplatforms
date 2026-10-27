# Managed PostgreSQL persistence

## Scope
The managed Supabase PostgreSQL/PostgREST boundary now covers assessment creation/read, production workspace-membership resolution, artifact metadata, source-addressable evidence segments, and extraction snapshots while retaining SQLite for the credential-free local/demo path.

## Configuration
Set `PERSISTENCE_PROVIDER=supabase-postgres`, `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Apply `db/migrations/001_postgres_rls.sql`, `002_supabase_jwt_rls.sql`, then `003_processing_rls.sql` using an administrative migration connection. Do not configure tenant relational CRUD with a service-role key.

## Security boundary
The application verifies the Supabase access token and forwards that same user JWT to PostgREST. RLS binds `auth.uid()` to persisted membership and tenant-bearing rows. Organization/workspace identifiers are server-selected and repeated as query filters. Assessment and processing writes require editor/admin membership; reads require exact membership. Processing replacement executes atomically through a `SECURITY INVOKER` RPC so RLS remains authoritative.

## Validation
Contract tests verify JWT forwarding, publishable-key use, explicit tenant filters, processing reconstruction, atomic-RPC shape, membership scoping, and RLS policy definitions. Live isolation validation must use at least two authenticated users in different workspaces and confirm neither can read/create/replace data in the other's scope.

## Current limitation
Extraction/finding review, reports, audit/deletion, and job persistence remain on the SQLite local/single-instance repositories. Confidential production use remains blocked until those repositories are migrated and live RLS/storage isolation tests pass.
