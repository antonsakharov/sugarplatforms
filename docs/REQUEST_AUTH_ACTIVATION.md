# Request-scoped authentication activation

## Status

Complete across the protected API route surface.

## Boundary

Every protected route passes the incoming `Request` to `requireServerPermission(request, permission)`. `AUTH_PROVIDER=local` retains the credential-free controlled demo identity. `AUTH_PROVIDER=supabase` extracts a bearer token or configured access-token cookie, verifies it server-side with Supabase Auth using `no-store`, resolves exact persisted organization/workspace membership, and then applies viewer/editor/admin permission checks.

Invalid, expired, malformed, or unavailable provider sessions fail as authentication-required. A verified identity without the required workspace membership or permission fails authorization. Request bodies cannot select tenant scope or role.

## Migrated surfaces

Assessment read/create/delete, artifact upload/processing, extraction review, finding review and AI promotion, report history/PDF, audit/deletion, deletion-job administration/reconciliation, tenancy, and Acme sample initialization all use the request-aware boundary.

## Remaining production gate

The current persisted membership resolver is the local/single-instance repository implementation. Confidential production activation still requires PostgreSQL/RLS-backed membership and application persistence plus live Supabase session and cross-tenant integration tests using non-bypass credentials.
