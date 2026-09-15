# Validated 2026-09-13

## Increment

Production-oriented Supabase private artifact storage adapter behind the existing provider-neutral `ArtifactStorage` boundary.

## User flow enabled

A validated architecture-metadata upload can now use either the credential-free local private filesystem or a configured private Supabase bucket without changing upload processing, parsing, evidence persistence, or deletion reconciliation. Managed storage preserves random tenant-scoped object keys, verifies SHA-256 before upload, uses authenticated private reads, deletes through the provider Storage API, and can generate bounded short-lived signed read URLs after tenant authorization.

## Validation gate

Implementation head `e0483f4691c9fa8f9f63990282c70c8bfb3d63cd` passed GitHub Actions validate run `34765312793` on Node 22.23.2:

- TypeScript: passed;
- source-policy lint: passed;
- tests: 156/156 passed, including five new Supabase provider/checksum/cross-tenant tests;
- optimized Next.js 15.4.10 production build: passed;
- repository snapshot packaging: passed;
- CI artifact upload: passed.

The final documentation head must pass the same complete workflow before this increment is handed off.

## Limits and security

MVP limits are unchanged: one focused assessment, one primary entity, up to 10 files, up to 25 MB per file, up to 150 measurable pages total, architecture metadata only, and no customer records, credentials, secrets, or live production access.

No Supabase credentials were available or committed. Provider behavior is validated with mocked HTTP contracts and tenant-boundary tests. Live verification of a real private bucket, anonymous-denial behavior, cross-tenant isolation, signed-URL expiry, deletion/reconciliation, retention/backup semantics, and malware/quarantine remains required before confidential production use.

## Decision

ADR-048 records the provider-neutral storage decision and the requirement that managed credentials remain server-only and signed URLs remain transient capability URLs.
