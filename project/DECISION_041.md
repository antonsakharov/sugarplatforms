# ADR-041 — Approved extraction is version-bound durable state

**Status:** Accepted

Extraction review decisions and approval for real assessments must be persisted server-side under the server-resolved organization/workspace scope. Browser local storage may cache a successful server response but is not authoritative.

A persisted review is valid only for the exact extraction snapshot from which it was reviewed. The application computes a SHA-256 fingerprint over extraction schema/provider/prompt/status plus object identity, kind, original name, and direct evidence references. A processing change that alters that fingerprint makes the old review stale; stale approval cannot be reused for diagnostics.

The server must validate one and only one review decision per current extraction object, preserve original object identity/kind/name, reject unknown objects, enforce same-kind valid merge targets, and require every object to be resolved before approval. Review reads require `extraction-review:read`; writes require `extraction-review:write`. Tenant scope and current extraction are resolved server-side rather than accepted from the client.

The credential-free local adapter persists this state in SQLite. Production deployment must carry the same contract into PostgreSQL/RLS and retain stale-version fail-closed behavior.
