# ADR-042 — Persisted finding review is bound to canonical deterministic diagnostics

**Status:** Accepted

Finding-review decisions and accepted findings must be persisted under the authenticated organization/workspace/assessment scope rather than treated as browser-authoritative state.

The server must revalidate submitted diagnostics against the current approved extraction and compare them with a fresh deterministic-engine result, ignoring only the generation timestamp. Review payloads must contain exactly one decision for every diagnostic finding, may not introduce or omit findings, and may edit only the fields already permitted by ADR-019.

Accepted findings are materialized and persisted only after explicit completion of a review with no pending decisions. A changed extraction approval or changed diagnostic fingerprint makes earlier finding review state stale and prevents it from authorizing maturity, maps, recommendations, or reports.

The current SQLite repository is a credential-free local/single-instance adapter. Production deployment still requires PostgreSQL/RLS-backed finding-review persistence, verified identity, audit/deletion controls, and live cross-tenant integration tests.
