# ADR-064 — Managed deletion finalization is checkpoint-gated

**Status:** Accepted

Managed assessment deletion may purge relational assessment state only after every private artifact/report object in the prepared deletion plan has a durable deletion checkpoint. Preparation, pending audit creation, and durable job creation are atomic under the verified administrator JWT and forced RLS. Finalization deletes the assessment (cascading tenant-scoped diagnostic rows), writes the success audit receipt in the same transaction, and leaves the deletion job/audit receipt available for operations. Storage deletion remains outside PostgreSQL and is therefore idempotently checkpointed.

The managed path is selected only when `PERSISTENCE_PROVIDER=supabase-postgres`; local/demo deletion remains unchanged. Live two-tenant Supabase certification is still required before confidential production use.
