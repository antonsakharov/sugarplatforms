# Authentication and Authorization Foundation

## Current slice

Sugar now resolves assessment access through an authenticated-context boundary containing a user identity, organization/workspace membership, role, and tenant. Assessment APIs no longer choose scope directly from request data or from a bare tenant configuration; they require a server-resolved membership with the permission needed for the operation.

The credential-free local/single-instance adapter is enabled by `LOCAL_AUTH_ENABLED=true` and creates one server-configured development identity and membership. The browser cannot select the user, organization, workspace, or role. This exercises the same authorization contract without requiring an external identity provider.

## Roles

- `viewer`: read assessments and tenant context.
- `editor`: viewer permissions plus create assessments.
- `admin`: current editor permissions; reserved for later workspace administration controls.

## API behavior

- `GET /api/auth/session` returns the server-resolved local identity, membership, tenant, auth method, and `productionReady=false`.
- `GET /api/tenancy` requires `tenant:read`.
- `POST /api/assessments` requires `assessment:create`.
- `GET /api/assessments/:id` requires `assessment:read`.
- unauthenticated access returns 401; insufficient role returns 403.
- responses carrying identity or tenant information use `Cache-Control: no-store`.

## Security boundary

This is an authentication/authorization **foundation**, not production identity. `local-dev` is a server-owned development adapter and is explicitly marked `productionReady=false`. Before confidential enterprise artifacts are accepted, replace it with a real identity provider/session verifier, persist production memberships, enforce PostgreSQL row-level security and tenant-scoped object storage, and run database/storage isolation tests.

## Configuration

`LOCAL_AUTH_ENABLED`, `LOCAL_USER_ID`, `LOCAL_USER_EMAIL`, `LOCAL_USER_NAME`, and `LOCAL_USER_ROLE` configure the local adapter. Disable `LOCAL_AUTH_ENABLED` to make real-assessment APIs fail closed until another server authentication provider is installed.
