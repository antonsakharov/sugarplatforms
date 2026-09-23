# Managed Processing Persistence

When `PERSISTENCE_PROVIDER=supabase-postgres`, validated processing state is stored in PostgreSQL rather than the local SQLite processing repository. Migration `003_processing_rls.sql` creates tenant-keyed `artifact_metadata`, `source_segments`, and `extraction_snapshots` tables and enables forced RLS.

Requests use the verified Supabase end-user access token plus the publishable project key. Reads require exact workspace membership. Replacement requires editor/admin membership. Organization, workspace, and assessment IDs are server-derived; client tenant IDs are never authorization input. The replacement RPC is `SECURITY INVOKER`, so RLS remains authoritative.

A successful upload replaces the three processing-state projections in one database transaction. A failed RPC leaves the previous snapshot intact. Reads explicitly filter organization, workspace, and assessment in addition to RLS. `PERSISTENCE_PROVIDER=sqlite` continues to use the existing credential-free local/demo repository.

Before confidential enterprise use, run live two-tenant Supabase validation proving tenant A cannot read or replace tenant B processing state using real authenticated non-`BYPASSRLS` identities.
