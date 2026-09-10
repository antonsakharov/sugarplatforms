# Audit and deletion workflow

## Purpose

Sugar Platform Diagnostic supports explicit, authorized deletion of a focused assessment in the credential-free local/single-instance runtime while retaining a minimal audit receipt for accountability.

## Authorization

Full assessment deletion is an administrator-only action (`assessment:delete`). Audit-event reads are also administrator-only (`audit:read`). Viewer and editor roles cannot delete an assessment or inspect deletion audit events. Tenant scope continues to come from the authenticated server context; organization/workspace identifiers are never accepted from the browser.

## Deletion sequence

1. Resolve the authenticated tenant and require administrator permission.
2. Verify that the assessment exists inside the exact organization/workspace scope.
3. Persist an `assessment.deletion.requested` audit event and operation ID.
4. Resolve private artifact object keys from persisted artifact IDs and the server-derived tenant/assessment prefix.
5. Delete private artifact objects sequentially.
6. Only after object deletion succeeds, transactionally purge assessment-scoped report snapshots, finding review, extraction review, source segments, artifact metadata, extraction snapshots, and the assessment row.
7. Persist an `assessment.deletion.completed` audit event containing row/object counts and return a receipt.
8. If object deletion fails, keep database assessment state intact and persist `assessment.deletion.failed`.

Audit receipts intentionally survive assessment deletion. They contain identifiers, actor ID, event/outcome, timestamps, and bounded deletion counts/error text; they do not retain artifact content, source segments, findings, reports, secrets, or raw uploaded data.

## API

- `DELETE /api/assessments/:id` — admin-only full assessment deletion; returns the durable deletion receipt; `Cache-Control: no-store`.
- `GET /api/assessments/:id/audit` — admin-only tenant-scoped audit history; remains available after successful deletion; `Cache-Control: no-store`.

## Local adapter limits

The filesystem + SQLite implementation cannot provide a distributed transaction across object storage and database state. It therefore fails closed by deleting objects before the transactional database purge. A storage failure leaves the assessment database state intact and records failure. A process/database failure after one or more object deletions could require an administrator retry or reconciliation; production object storage should use idempotent delete operations and the durable job/audit model should track retry state.

Production readiness still requires PostgreSQL/RLS-backed audit/deletion, production private object storage, retention policy enforcement, backup/restore deletion semantics, production identity verification, and live cross-tenant integration tests.
