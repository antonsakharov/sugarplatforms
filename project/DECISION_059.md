# ADR-059 — Generated-report metadata uses the verified end-user JWT

Status: accepted — 2026-09-24

## Decision

When managed PostgreSQL persistence is selected, generated-report object metadata must be read and written through PostgREST using the same verified end-user Supabase access token that authorized report export. Tenant scope is server-derived and repeated as explicit query predicates; forced RLS remains the database enforcement boundary. Service-role/BYPASSRLS credentials are not permitted on this user-facing path.

The local/demo provider remains SQLite-backed. Object bytes continue through the existing private storage abstraction. A failed metadata insert triggers best-effort cleanup of the newly written object.

## Consequences

Generated PDF bytes and their immutable metadata can now use managed providers without silently falling back to local SQLite. Live two-tenant Supabase certification remains required before confidential production use.
