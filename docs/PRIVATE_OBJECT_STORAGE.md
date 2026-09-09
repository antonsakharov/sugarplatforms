# Private Object Storage

## Status

Private artifact storage foundation is implemented for local/single-instance development. Production S3/Supabase activation remains separate work.

## Security boundary

Artifact bytes are never persisted until the existing upload metadata checks, duplicate detection, page-limit checks, and content-risk scan have completed and the artifact set is ready for analysis. Files requiring review or blocked files remain transient.

Storage operations run server-side only and require authenticated membership permissions. The browser cannot choose organization/workspace scope or a storage key.

## Tenant key layout

Stored objects use randomized keys under:

`<organization-id>/<workspace-id>/<assessment-id>/<random-artifact-id>`

Original filenames are metadata only and never become filesystem/object-store paths.

Every read/delete operation revalidates that the requested key is inside the active organization/workspace prefix. Traversal (`..`), absolute paths, and cross-tenant prefixes fail closed.

## Local adapter

`LocalPrivateArtifactStorage` writes under `PRIVATE_ARTIFACT_ROOT` (default `.data/private-artifacts`). Directories are created with mode `0700` and files with mode `0600`. The configured root must not be web-served.

This adapter is intended for credential-free development and persistent single-instance deployments. It is not a substitute for production object storage in horizontally scaled/serverless deployments.

## Production adapter requirements

The production S3-compatible/Supabase adapter must preserve the same `ArtifactStorage` interface and additionally provide:

- private bucket/container only;
- server-only credentials;
- tenant-scoped keys;
- short-lived signed download URLs after authorization;
- encryption at rest and TLS in transit;
- object metadata/checksum verification;
- deletion support;
- malware/quarantine workflow;
- cross-tenant integration tests;
- lifecycle/retention policy.

## Current limitations

Artifact metadata is returned to the current request but is not yet durably recorded in PostgreSQL/SQLite. Parsed evidence/review state also remains browser/transient. Production object storage credentials are intentionally not required for this slice.
