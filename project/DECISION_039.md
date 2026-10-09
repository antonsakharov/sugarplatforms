# ADR-039 — Persist only validated artifacts behind a tenant-scoped private storage interface

Status: accepted — 2026-09-04

## Context

The local/demo upload path previously inspected and parsed uploaded bytes transiently. Production readiness requires durable private object storage without weakening the architecture-metadata-only boundary or trusting client-selected tenant paths.

## Decision

Introduce a server-only `ArtifactStorage` interface. Persist artifact bytes only after the complete upload/content-readiness gate succeeds. Generate random object IDs and derive keys solely from server-resolved organization, workspace, and assessment IDs. Never derive object paths from original filenames. Revalidate tenant prefix on read/delete and fail closed on traversal or cross-tenant keys.

The credential-free implementation uses a private local filesystem root with restrictive permissions. A production S3-compatible/Supabase adapter must preserve the interface and authorization model, use private buckets and short-lived signed URLs, and pass real cross-tenant isolation tests before confidential enterprise use.

## Consequences

Flagged uploads are not durably stored. Original filenames remain metadata only. Local storage supports development/single-instance operation but not serverless horizontal scaling. Durable artifact metadata, malware quarantine, production signed URLs, and storage/database integration tests remain separate work.
