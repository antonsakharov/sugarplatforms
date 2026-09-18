# ADR-038 — PostgreSQL RLS is the production tenant enforcement boundary

**Status:** Accepted

Production assessment persistence must not rely only on application-supplied tenant predicates. A request must enter a database transaction with user, organization, and workspace identity derived from the verified authenticated membership and bound through transaction-local PostgreSQL settings. Tenant-bearing tables force row-level security, assessment reads require matching membership, and assessment inserts additionally require editor/admin membership. The runtime database role must not be a superuser and must not have `BYPASSRLS`.

SQLite remains the credential-free local/single-instance adapter under ADR-010. Live PostgreSQL cross-tenant tests and private-storage isolation remain required before confidential enterprise inputs are enabled.
