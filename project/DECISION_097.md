# Decision 097 — Bounded PDF xref-stream zero-width `/W` defaults

**Date:** 2026-11-02  
**Status:** Accepted for the credential-free local/demo parser; not production PDF certification.

## Context

Decision 096 validates single-revision, complete PDF 1.5 Flate cross-reference streams with strict source-byte provenance. The PDF `/W` array allows a zero width for a field: the omitted type defaults to 1 (in-use), while the omitted second and third fields default to 0. The prior validator rejected every zero-width field, including otherwise verifiable architecture PDFs.

## Decision

Accept individual zero widths in `/W` with explicit PDF-defined defaults and a nonzero total entry stride. Keep each width at most four bytes, the bounded decoded stream, full `[0 Size]` index, one revision, exact physical direct-object offsets, unique compressed indexes, and complete object coverage. Object zero must remain free and unreferenced; when the generation field is omitted its encoded default is zero, rather than a fabricated 65535. A zero-width type field means all entries are in-use and therefore fails the current complete-index object-zero invariant; a zero-width offset cannot invent a physical position. Omitted compressed indexes can only refer to index zero and must still match an actual unique compressed object.

Do not alter raw stream bytes, object offsets, page-tree locators, metadata/evidence separation, or upload constraints. Unsupported or ambiguous PDFs fail closed.

## Interfaces and limitations

Only `lib/pdf-xref-stream.ts`, its fixture/regression tests, and documentation change. No new route, UI, schema, migration, job, external credential or production access is required. Existing limits (one focused assessment, one primary entity, 10 files, 25 MB/file, 150 measurable pages, architecture metadata only) remain enforced by the upload/assessment boundary. Production-grade PDF/OCR and live authenticated non-bypass two-tenant PostgreSQL/RLS, private storage and malware-scanner certification remain independent blockers.

See `project/VALIDATED_2026-11-02.md`.
