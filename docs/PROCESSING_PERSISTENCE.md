# Durable artifact metadata and evidence persistence

## Purpose

This increment makes a validated assessment resumable after upload processing without moving raw artifact bytes into the application database.

## Persisted state

After an upload set passes the existing count, size, page, duplicate, and content-risk gates, Sugar persists:

- private-storage artifact metadata;
- parser artifact identity and parser kind;
- source-addressable normalized segments and locators;
- source-segment SHA-256 values;
- parser warnings;
- the current extraction envelope and its provider/prompt provenance;
- processing persistence timestamp.

Raw uploaded bytes remain in the private object-storage adapter only.

## Tenant boundary

Every processing row carries organization ID, workspace ID, and assessment ID. Reads and writes require server-resolved tenant scope. The authenticated processing read API uses `artifact:read`; upload/persistence continues to require `artifact:create`.

The local SQLite adapter is a credential-free development/single-instance implementation. Production PostgreSQL must enforce the same boundary with RLS before confidential enterprise inputs are enabled.

## Transaction model

A processing snapshot is replaced atomically. Source segments, artifact metadata, and the extraction snapshot are committed together or rolled back together. Reprocessing an assessment therefore replaces stale normalized evidence instead of silently accumulating duplicate rows.

## Resumability API

`GET /api/assessments/:id/processing`

Returns the current tenant-scoped processing snapshot with `Cache-Control: no-store`. It never returns private object-storage paths or raw object bytes.

## Security constraints

The MVP limits remain unchanged: one focused assessment, one primary entity, up to 10 files, 25 MB per file, and 150 measurable pages total. Architecture metadata only; no customer records, credentials, secrets, or live production access.

This slice does not add malware scanning, signed object URLs, audit/deletion workflows, production identity verification, or server-backed extraction/finding review decisions. Those remain production-readiness gates.
