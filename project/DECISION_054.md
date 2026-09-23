# ADR-054 — Managed processing snapshots use end-user-JWT RLS and atomic replacement

**Status:** Accepted

Production artifact metadata, source-addressable evidence segments, and extraction snapshots are persisted through Supabase PostgREST using the verified end-user JWT and publishable project key. Tenant scope remains server-derived and is repeated in every read filter as defense in depth; a service-role key is prohibited for tenant processing CRUD.

Replacing a processing snapshot is one PostgreSQL transaction exposed as a `SECURITY INVOKER` RPC. The function requires editor/admin membership, verifies the target assessment through RLS, deletes only the exact organization/workspace/assessment state, and inserts the replacement artifact, segment, and extraction rows. Readers require workspace membership. SQLite remains the credential-free local/demo adapter.
