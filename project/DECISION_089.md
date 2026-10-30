# Decision 089 — Stable SQLite audit order for same-millisecond events

Date: 2026-10-25  
Status: Accepted for the local/single-instance persistence adapter.

## Context

A networked CI run revealed a nondeterministic audit-event ordering failure: an assessment deletion request and its failure receipt can share the same millisecond `created_at` timestamp. The SQLite audit reader ordered by `(created_at, id)`, but the randomly generated UUID `id` is not a causal ordering key, so failure could appear before the request.

## Decision

For the local SQLite audit table (which is a rowid table), sort by `(created_at ASC, rowid ASC)`. This preserves chronological order and insertion order when timestamps tie. Do not modify the audit schema, event payload, tenant scoping, or authorization. Add a regression that deliberately makes the event timestamps equal and reverses UUID lexical order to prove stable request-before-failure rendering.

## Boundaries

The fix applies only to the SQLite local/single-instance adapter; PostgreSQL audit ordering and live tenant isolation require their own validation. Audit receipts remain minimal and tenant-scoped. No changes to upload limits, evidence rules, or production deployment.
