# ADR-057 — Managed report versions are database-allocated immutable snapshots

**Status:** Accepted

When managed PostgreSQL persistence is selected, report history is stored under forced RLS and accessed with the verified end-user JWT. Report version numbers and IDs are allocated inside a `SECURITY INVOKER` database RPC under an assessment-scoped transaction advisory lock rather than by the browser or application process.

A managed report snapshot may be created only when the same tenant/assessment has a completed finding review and the report's diagnostic provenance exactly matches the currently persisted diagnostic generation timestamp. Saved snapshots are immutable inputs to later JSON/PDF export. Tenant-bearing report CRUD must not use a service-role bypass.

The SQLite implementation remains the credential-free local/demo adapter. Generated-report private object storage and live two-tenant Supabase certification remain separate production-readiness work.
