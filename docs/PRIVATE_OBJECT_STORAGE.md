# Private Object Storage

## Status

The private-storage boundary supports both the credential-free local/single-instance adapter and a production-oriented Supabase private-bucket adapter. Live production bucket and cross-tenant validation still require external infrastructure credentials.

## Security boundary

Artifact bytes are never persisted until upload metadata checks, duplicate/page-limit checks, and content-risk scanning complete and the artifact set is ready for analysis. Files requiring review or blocked files remain transient.

Storage operations run server-side only. The browser cannot choose organization/workspace scope or arbitrary storage keys.

## Tenant key layout

Stored objects use randomized keys under:

`<organization-id>/<workspace-id>/<assessment-id>/<random-artifact-id>`

Original filenames remain metadata only and never become filesystem/object-store paths. Every read, sign, and delete operation revalidates the active organization/workspace prefix; traversal, absolute paths, and cross-tenant prefixes fail closed before provider I/O.

## Local adapter

`ARTIFACT_STORAGE_PROVIDER=local` is the default. `LocalPrivateArtifactStorage` writes beneath `PRIVATE_ARTIFACT_ROOT` (default `.data/private-artifacts`) with mode-restricted directories/files. It intentionally does not create browser-facing signed URLs.

## Supabase adapter

Set `ARTIFACT_STORAGE_PROVIDER=supabase` and provide these server-only values:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_STORAGE_BUCKET` (default `sugar-platform-artifacts`)
- `SUPABASE_SIGNED_URL_TTL_SECONDS` (default 300; allowed 60–3600)

The bucket must be private. Never expose the secret key through `NEXT_PUBLIC_*` variables, browser code, logs, reports, or audit records.

`SupabasePrivateArtifactStorage` preserves the same server storage contract used by upload processing and deletion reconciliation. It recomputes SHA-256 before upload, uses server-derived random tenant keys, performs authenticated private reads, deletes through the Storage API, and can generate a short-lived signed read URL only after the caller already holds authorized tenant scope.

Signed URLs are capability URLs. The application must treat them as transient output: do not persist them in assessment/report state and do not log query tokens. The configured TTL is capped at one hour and defaults to five minutes.

## Deletion and recovery

Assessment deletion continues through the durable deletion-job workflow. Provider deletion remains behind `ArtifactStorage.delete`, so per-object checkpoints, bounded retry/backoff, crash recovery, and redacted administrator status work for both local and Supabase adapters.

## Required production validation

The adapter is covered by mocked provider-contract and tenant-isolation tests. Before confidential customer use, run live tests against a dedicated private bucket and production-like identities to verify:

1. objects cannot be anonymously listed or read;
2. one tenant cannot read, sign, overwrite, or delete another tenant's key;
3. signed URLs expire as configured;
4. assessment deletion removes its objects and subsequent reads fail;
5. runtime credentials are absent from client bundles/logs;
6. retention/backup semantics and malware/quarantine controls are configured.

Production identity verification, live PostgreSQL/RLS validation, malware scanning/quarantine, and provider-backed retention/backup controls remain separate release gates.
