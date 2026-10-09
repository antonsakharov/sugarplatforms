# Organization and Workspace Tenancy

## Purpose

Sugar now models organization and workspace identity explicitly before authentication is introduced. This creates a stable tenant boundary for persistence and the later PostgreSQL/RLS migration without pretending that local mode is enterprise authorization.

## Local/single-instance setup

The server bootstraps one tenant context from environment configuration:

- `LOCAL_ORGANIZATION_ID` (default `local-org`)
- `LOCAL_ORGANIZATION_NAME` (default `Local Organization`)
- `LOCAL_WORKSPACE_ID` (default `local-demo`)
- `LOCAL_WORKSPACE_NAME` (default `Local Diagnostic Workspace`)

Organization and workspace identities are persisted in the same SQLite database configured by `ASSESSMENT_DB_PATH`. Existing local assessment rows remain compatible when the default `local-demo` workspace ID is retained.

## Isolation behavior

Assessment repository reads and writes require both `organizationId` and `workspaceId`. The repository verifies that the workspace belongs to the organization before any assessment query. A workspace ID cannot be rebound to another organization. The active local tenant is server-owned; clients do not submit or switch tenant IDs.

`GET /api/tenancy` returns the active non-secret tenant identity with `authenticated: false` and `Cache-Control: no-store` so operators can verify local configuration.

## Security boundary

This slice is tenant scoping, not authentication or authorization. It is appropriate for local/single-instance development and controlled demos only. Confidential enterprise use still requires authenticated organization membership, workspace roles, PostgreSQL row-level security, private tenant-scoped object storage, database/storage isolation tests, audit logging, deletion controls, and operational hardening.

## Next migration

Authentication and authorization are the next production-readiness slice. After identity is authenticated, the same tenant scope should be resolved from the authenticated membership rather than local environment configuration, then enforced again by PostgreSQL RLS and storage policies.
