# Decision 096 — Bounded PDF xref-stream whitespace and comments

**Date:** 2026-11-01  
**Status:** Accepted for the credential-free local/demo parser, not production PDF certification.

## Context

Decision 095 validates a flat PDF 1.5 Flate cross-reference stream dictionary, optional `/Info` and `/ID`, and independently proven physical-page evidence. Valid PDF generators may insert lexical whitespace and `%` comments between dictionary tokens or around terminal `startxref`. Rejecting those documents unnecessarily limits supported architecture metadata ingestion.

## Decision

Accept only PDF whitespace (NUL, HT, LF, FF, CR, space) and `%` comments ending at CR or LF within the **4-KiB bounded xref-stream dictionary and terminal `startxref` region**. Normalize those regions only for strict dictionary parsing and temporary Flate filter selection. Never alter the original PDF, encoded stream bytes, direct-object offsets, xref entry bytes, compressed indexes or page evidence. Keep hexadecimal `/ID` values opaque: malformed or commented hex strings fail closed. Require a unique line-anchored final `startxref` and `%%EOF`, and reject extra trailing content.

Continue to reject unknown or duplicate fields, invalid `/Info` references, unsupported `/W` and `/Index`, malformed comments/whitespace, encrypted, hybrid and incremental revisions, mismatched offsets and unproven page references. Comments and metadata never become architecture objects, source segments, findings or reports. The existing upload quarantine and server-enforced one-assessment, one-primary-entity, 10-file, 25-MB-per-file, 150-page and architecture-only limits are unchanged.

## Interfaces and limitations

Changes are limited to `lib/pdf-xref-stream.ts`, regression tests, and documentation. No new route, UI, schema, migration, job, external service or production connection is required. The local/demo parser intentionally remains a strict PDF subset; arbitrary PDF/OCR and live authenticated non-`BYPASSRLS` two-tenant database, private storage and malware-scanner certification remain separate release blockers.

See `project/VALIDATED_2026-11-01.md`.
