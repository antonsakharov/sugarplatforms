# Decision 092 — Bounded classic PDF xref table integrity

**Date:** 2026-10-28  
**Status:** Accepted for the local/demo PDF adapter; not production PDF certification.

## Context

Decision 091 validates single PDF 1.5 xref streams but rejects classic cross-reference tables, including ordinary PDF 1.4 architecture documents. Reading only physical `obj` declarations without validating a declared classic xref table could trust stale or substituted page references.

## Decision

Validate a single, complete, non-incremental classic `xref` table before trusting extracted page provenance. Require a unique final `startxref` pointing to the exact physical `xref` byte offset, one `%%EOF`, a bounded table (at most 4,096 entries and 96 KiB), fixed-width 10-digit offset/5-digit generation records, and contiguous ascending subsections covering `[0, Size)`. Object zero must be the canonical free entry; live objects must have generation zero and byte offsets matching direct object declarations; every direct object must be indexed and no free entry may shadow one. Require a unique `/Size` and a direct generation-zero `/Root` referencing an actual Catalog. Accept only `/Size` and `/Root` in the trailer for now.

Reject missing/duplicate entries, invalid offsets, nonzero live generations, orphan objects, unsupported trailer keys, hybrid xref streams, compressed object streams, `/Prev` and `/XRefStm`, multiple tables, revisions, and malformed EOF. Existing strict xref-stream validation remains unchanged for stream-based PDFs. Minimal legacy demo PDFs with no declared xref remain supported, but never gain fabricated page evidence. Independently verified Catalog/Page-tree/Contents relationships are still mandatory for physical-page locators.

## Scope and security

No new network access, external PDF services, persistence, UI, schemas, background jobs, or upload permissions. Existing one-assessment, one-entity, 10-file, 25-MB-per-file, 150-page, architecture-metadata-only and prohibited-content policies remain server-enforced. This is a narrow, fail-closed local parser improvement; production PDF/OCR, live malware scanning, private storage, and authenticated two-tenant PostgreSQL certification remain outstanding.

See `project/VALIDATED_2026-10-28.md`.
