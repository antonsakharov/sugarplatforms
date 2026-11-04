# ADR-051 — Request-scoped authentication is selected server-side

Status: accepted

## Decision

API authorization must resolve identity from the incoming HTTP request when `AUTH_PROVIDER=supabase`. Bearer access tokens are accepted for API clients and the configured access-token cookie is accepted for browser sessions. Supabase verifies identity; Sugar then resolves the exact persisted organization/workspace membership before permission checks.

The active organization/workspace remains server-owned in this slice. Client headers, request bodies, token metadata, and user metadata cannot select tenant scope or role.

`AUTH_PROVIDER=local` remains the credential-free demo path. Routes not yet migrated to the request-aware overload fail closed when Supabase auth is selected rather than silently falling back to local identity.

## Consequences

- invalid, expired, missing, or unverifiable sessions return 401 at migrated boundaries;
- verified identities without membership return 403;
- assessment creation and the session endpoint now exercise the production request boundary;
- remaining API routes must migrate to request-aware authorization before production auth can be considered fully activated;
- PostgreSQL/RLS-backed membership persistence and live cross-tenant validation remain required for production confidential-data use.
