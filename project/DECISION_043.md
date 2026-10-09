# ADR-043 — Downstream reviewed outputs hydrate server authority

**Status:** Accepted

Maturity, recommendations, Entity/ID visualization, AI-candidate promotion handoff, and executive-report generation must hydrate the current authenticated server review boundary before use. Browser `localStorage` may be refreshed only after successful server reads and remains a compatibility cache, never an alternate authority for accepted findings.

A downstream accepted-finding projection must fail closed unless the current extraction is approved, persisted finding review is non-stale and explicitly completed, no decisions remain pending, the review diagnostic timestamp matches the persisted diagnostic envelope, and materialized accepted findings correspond to accepted review decisions.

AI candidate generation may continue to use the credential-free local provider, but promotion must cross a server authorization boundary. The server must revalidate candidate provenance against the current approved extraction and exact persisted diagnostic version, persist the promoted item as a pending normal finding, and reset normal finding review. After a server-trusted promotion, finding-review updates may accept only fresh deterministic diagnostics or the exact server-persisted promoted diagnostic envelope; arbitrary client-modified diagnostic sets remain invalid.

This decision does not make report-version history durable and does not replace production identity, PostgreSQL/RLS activation, production private object storage, malware controls, audit/deletion, or live tenant-isolation validation.
