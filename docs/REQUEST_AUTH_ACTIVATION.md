# Request authentication activation

Sugar now has a selectable server authentication mode.

## Local/demo

Set `AUTH_PROVIDER=local`. Existing local membership bootstrap remains available for the controlled demo and is never marked production-ready.

## Supabase request mode

Set `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. The server accepts an access token from `Authorization: Bearer <token>` or the cookie named by `AUTH_ACCESS_TOKEN_COOKIE_NAME` (default `sugar-access-token`). Bearer wins if both are present.

The server calls Supabase Auth `/auth/v1/user` with `cache: no-store` and a bounded timeout, then looks up the verified user ID in Sugar's persisted membership store for the server-selected organization/workspace. Token/user metadata never supplies role or tenant scope.

## HTTP behavior

Missing/invalid/expired identity is 401. Verified identity without the exact membership, or a membership lacking the required permission, is 403. Auth/session responses are `no-store`.

## Current activation boundary

`GET /api/auth/session` and `POST /api/assessments` use the request-aware resolver. The compatibility overload used by older routes is local-only and fails closed when Supabase mode is selected. This prevents accidental local identity fallback while the remaining route handlers are migrated.

## Production limitation

This slice intentionally keeps the existing persisted membership repository so the boundary is testable without cloud credentials. Production activation still requires migration of every protected route plus PostgreSQL/RLS membership persistence and live identity/tenant-isolation tests.
