# ADR-053 — Managed PostgreSQL requests use the verified user JWT, not a service-role bypass

**Status:** Accepted

Production assessment persistence and membership resolution may use Supabase PostgREST only when the request is authenticated with the same verified end-user access token used by Sugar's server identity boundary. The publishable key may identify the Supabase project, but a service-role/secret key must not be used for tenant-bearing relational CRUD because it would bypass row-level security.

Every managed assessment request includes explicit server-derived organization/workspace filters in addition to RLS. Membership lookup is constrained to the verified user ID plus the server-selected organization/workspace. Database policies use `auth.uid()` and membership rows to authorize reads and require editor/admin membership for assessment inserts. The database unique index remains authoritative for the one-active-assessment-per-workspace limit.

The SQLite adapter remains the credential-free local/demo implementation. Managed assessment persistence is selectable with `PERSISTENCE_PROVIDER=supabase-postgres`; downstream processing, review, finding, report, audit, and job repositories are not represented as migrated by this decision. Live cross-tenant validation remains blocked until a real Supabase project and at least two isolated test tenants/users are available.
