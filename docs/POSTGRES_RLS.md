# PostgreSQL and Row-Level Security

## Purpose

This production-readiness slice defines the database-enforced tenant boundary for Sugar Platform Diagnostic. SQLite remains the credential-free local/single-instance adapter. PostgreSQL is the target for confidential multi-tenant deployments.

## Migration

`db/migrations/001_postgres_rls.sql` creates organizations, workspaces, users, memberships, and assessments with relational tenant keys. It enables and **forces** row-level security on every tenant-bearing table.

Runtime access is scoped with transaction-local settings: `app.user_id`, `app.organization_id`, and `app.workspace_id`. The application must bind those values only from a verified authenticated membership. Browser payloads must never select them.

Assessment reads require a membership matching the active user, organization, and workspace. Assessment inserts additionally require `editor` or `admin`. The one-active-assessment limit is protected by a partial unique index as a database invariant.

The production application database role must not be a PostgreSQL superuser and must not have `BYPASSRLS`. Provisioning organization/workspace/user/membership rows should be performed by a narrowly scoped administrative path separate from ordinary assessment requests.

## Application adapter

`lib/postgres-rls.ts` provides a driver-neutral async adapter. `withRlsSession` opens a transaction, binds authenticated tenant context with transaction-local `set_config`, runs the operation, and commits or rolls back. Assessment SQL deliberately takes tenant identity from database session context rather than browser-supplied tenant parameters.

A concrete PostgreSQL driver is intentionally not activated in the credential-free runtime. Production activation requires a PostgreSQL client/connection pool, `DATABASE_URL`, verified production authentication, migration execution, and integration tests against a real non-superuser database role.

## Isolation validation before confidential use

Before enabling confidential enterprise uploads, CI/staging must prove that a user cannot read another workspace by guessing IDs, a viewer cannot insert, editors/admins write only to their membership-bound workspace, missing session settings cannot expose or insert tenant rows, the runtime role cannot bypass RLS, and private object-storage keys enforce the same organization/workspace boundary.

The current tests validate migration policy structure and transaction-bound context behavior without claiming a live PostgreSQL integration test.
