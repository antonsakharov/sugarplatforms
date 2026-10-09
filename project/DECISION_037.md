# ADR-037 — Server-resolved membership gates real-assessment APIs

**Status:** Accepted

Real-assessment API access must pass through a server-resolved authenticated context that binds a user identity to exactly one organization/workspace membership and role for the active request. Clients may not select or override their organization ID, workspace ID, user ID, or role in request payloads. Authorization is permission-based and fails closed: unauthenticated requests return 401 and authenticated memberships lacking the required permission return 403.

The credential-free `local-dev` identity provider is permitted only as a development/single-instance adapter under ADR-010. It is server-configured, persists its membership through the same repository boundary, and is explicitly marked `productionReady=false`. It does not satisfy the production identity requirement. Confidential enterprise inputs remain blocked on a verified production session provider, PostgreSQL row-level security, private tenant-scoped storage, and database/storage tenant-isolation validation.
