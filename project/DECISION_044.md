# ADR-044 — Saved reports are server-generated tenant-scoped snapshots

**Status:** Accepted

Explicit executive-report versions are persisted only after the server regenerates the report from the current authenticated assessment, validated artifact metadata, approved extraction, completed non-stale finding review, and deterministic downstream projections. Report version creation accepts no client-supplied report body.

Each assessment receives immutable monotonically increasing report snapshots under organization/workspace scope. Viewers may read saved reports; editors and admins may create new versions. Formal PDF export resolves an existing persisted snapshot by assessment ID and report ID after authorization and must not accept an arbitrary client snapshot.

The local adapter uses SQLite behind a report repository boundary. Production deployment must replace or back this boundary with PostgreSQL/RLS and private generated-report storage without weakening authorization, provenance, or immutability guarantees.
