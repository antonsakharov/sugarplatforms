# ADR-040 — Persist normalized evidence separately from raw artifact bytes

**Status:** Accepted

Validated artifact bytes remain in private tenant-scoped object storage. The application database persists only the artifact metadata required for provenance, source-addressable normalized parser segments, parser warnings, and the current extraction envelope.

Processing persistence must be transactionally replaceable for one assessment so reprocessing cannot leave a mixed old/new evidence graph. Every persisted row is scoped by organization, workspace, and assessment. Authenticated reads require `artifact:read`; processing writes remain behind `artifact:create` and server-resolved tenant context.

Normalized segment content is still customer-provided material and must be protected as confidential application data even though the product accepts architecture metadata only. It must not be logged routinely or returned outside the authenticated tenant boundary.

The local SQLite implementation exercises the domain contract without external credentials. Production activation still requires PostgreSQL/RLS enforcement, production identity verification, private production object storage, malware scanning, audit/deletion controls, and live cross-tenant integration tests.