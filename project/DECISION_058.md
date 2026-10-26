# ADR-058 — Generated PDFs are immutable private derivatives

**Status:** Accepted

A generated PDF is a private derivative of one immutable reviewed report snapshot. Materialization must be tenant-scoped, checksum-bound, idempotent for the report version, and incapable of changing report facts or provenance. Object keys are random and server-derived. Short-lived signed URLs are transient capabilities and must not be persisted or logged. Assessment deletion must remove generated-report objects before relational assessment state is purged. Managed PostgreSQL metadata activation remains a separate gate until it can use the verified end-user JWT and RLS without a service-role bypass.
