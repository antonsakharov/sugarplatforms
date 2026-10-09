# Assessment Persistence

## Current vertical slice

Assessment setup now persists server-side before the create API returns success. The current credential-free adapter uses Node's SQLite runtime and stores only validated assessment metadata. Browser `localStorage` remains a compatibility cache so older local/demo drafts still open, but it is no longer the source of truth for newly created assessments.

## Configuration

`ASSESSMENT_DB_PATH=.data/sugar-platform-diagnostic.sqlite`

The database directory is created on first use. The adapter uses WAL mode, a workspace-scoped primary key, and a transaction when enforcing the MVP limit of one active assessment per workspace.

## Security and scope

This slice persists assessment metadata only. It does not persist uploaded artifact bytes, parsed source text, evidence, extracted objects, findings, or reports. The local demo workspace is intentionally fixed to `local-demo` because authentication and organization membership are separate production-readiness features.

SQLite is suitable for the local/cPanel single-instance adapter. It is not the target multi-tenant production database and is not appropriate for ephemeral serverless filesystems. The repository boundary is intentionally explicit so PostgreSQL/Supabase can replace it without changing assessment-domain behavior.

## Production follow-up

Before confidential enterprise use, replace the fixed local workspace with authenticated organization/workspace identity, use PostgreSQL with row-level security and tenant-isolation tests, and add private object storage plus audit/deletion controls.
