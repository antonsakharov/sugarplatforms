# ADR-048: Keep artifact storage provider-neutral and activate Supabase behind the server boundary

Date: 2026-09-13

## Decision

Keep `ArtifactStorage` as the authoritative server-only object-storage boundary. Retain the local private-filesystem adapter for credential-free development/demo use and add a Supabase private-bucket adapter selected by server configuration.

The production adapter must:

- preserve server-derived `<organization>/<workspace>/<assessment>/<uuid>` keys;
- recompute SHA-256 before upload;
- reject traversal and cross-tenant keys before provider I/O;
- use server-only credentials for upload/read/delete/sign operations;
- use private authenticated reads by default;
- issue browser-capable signed read URLs only with bounded TTL after authorization;
- delete through the storage provider API so durable deletion jobs remain provider-neutral.

Signed URLs are transient capability URLs and are not persisted in reports, assessment state, or audit events.

## Rationale

The application already centralizes artifact persistence behind a narrow interface. Replacing that boundary would increase security risk and couple upload/deletion logic to infrastructure. Provider selection keeps the validated local demo path working while allowing a managed private bucket in production-like deployments.

Supabase was chosen for the first managed adapter because the target architecture already anticipates Supabase/PostgreSQL and Supabase Storage supports private authenticated downloads and time-limited signed URLs. The boundary remains compatible with a future S3 implementation.

## Consequences

- Local/demo runs continue without cloud credentials.
- Selecting `supabase` fails fast unless required server-only configuration is present.
- Live private-bucket isolation, retention, backup, and malware/quarantine validation remain deployment gates rather than being simulated as complete.
- The signed-read method is part of the storage contract; local storage returns no signed URL because local private files must not be exposed as public capabilities.
