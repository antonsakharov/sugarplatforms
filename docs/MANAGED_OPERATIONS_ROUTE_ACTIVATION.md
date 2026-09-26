# Managed operations route activation

This increment activates managed PostgreSQL/RLS reads for administrator audit receipts and deletion-job visibility while preserving the local demo adapter.

With `PERSISTENCE_PROVIDER=supabase-postgres`, authenticated audit and deletion-job API reads forward the verified request identity to the managed persistence adapter. Queries repeat the server-derived organization/workspace scope explicitly and forced RLS independently requires exact administrator membership.

With `PERSISTENCE_PROVIDER=sqlite`, existing local/single-instance repositories remain unchanged.

Activated routes:
- `GET /api/assessments/:id/audit`
- `GET /api/admin/deletion-jobs`

Both remain no-store and authorize before persistence access.

This slice intentionally does not activate managed deletion mutations. The executor/reconciliation path remains local until provider-neutral lifecycle and job mutation contracts are complete. Live two-tenant managed validation still requires isolated authenticated test identities.
