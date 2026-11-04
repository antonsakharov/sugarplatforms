# ADR-055 — Managed extraction review is atomically bound to persisted extraction

**Status:** Accepted

Managed extraction-review state uses the verified end-user JWT, forced PostgreSQL RLS, explicit organization/workspace/assessment filters, and a `SECURITY INVOKER` save RPC. The RPC compares the exact reviewed extraction JSONB with the current persisted extraction snapshot before writing review decisions. This database-side check closes the race between reading processing state and approving extraction; a changed extraction fails the save as stale.

The application SHA-256 extraction fingerprint remains the review version identifier, but authorization and atomic staleness enforcement remain server/database owned. SQLite remains the credential-free local/demo adapter.
