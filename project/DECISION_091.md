# Decision 091 — Strict PDF 1.5 cross-reference stream integrity

**Date:** 2026-10-27  
**Status:** Accepted for the bounded local/demo PDF adapter; not production PDF certification.

## Context

The object-stream parser can expand compressed page dictionaries, but a PDF cross-reference stream may contradict physical object offsets or compressed-object indexes. Trusting raw object declarations alone could attribute evidence to a stale or substituted object. The local parser must not infer page provenance from ambiguous revisions.

## Decision

For PDFs declaring an xref stream, require one complete, Flate-compressed `/Type /XRef` object with a direct bounded `/Length`, `/Size` (2–4096), three explicit `/W` widths (1–4 bytes each), and a full `[0 Size]` index (implicit or explicit). Require a unique final `startxref` pointing exactly to that object's byte offset, one `%%EOF`, and a valid `/Root` Catalog. Validate every type 0/1/2 entry: direct generation-zero object offsets must match raw bytes; compressed entries must match their indexed `/ObjStm` object numbers and positions; all direct and expanded objects must be indexed. Cache decoded object-stream indexes so malicious xref repetition cannot cause repeated decompression. Cap decoded xref bytes at 64 KiB and reuse the existing 1 MiB object-stream bound.

Reject malformed offsets, missing objects, duplicate declarations, unsupported filters or widths, sparse indexes, classic xref tables, hybrid `/XRefStm`, incremental `/Prev`, multiple EOFs/revisions, and unproven catalogs. Minimal demo PDFs without an xref declaration remain supported, but they cannot claim validated xref integrity. Only the independently verified page tree can produce physical-page evidence.

## Scope and limitations

No changes to upload limits, architecture-metadata-only policy, tenancy, authorization, storage, model calls, or reports. This is a conservative local/demo subset, not arbitrary PDF parsing, OCR, layout reconstruction, or production security certification. See `project/VALIDATED_2026-10-27.md`.
