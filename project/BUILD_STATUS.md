# Build Status

## 2026-08-10

### Implemented in this increment

- [-] PAR-001 deterministic text and Markdown parsing with heading-aware line ranges
- [-] PAR-002 deterministic JSON, YAML, and OpenAPI classification/parsing
- [-] PAR-006 source-addressable segment model with stable artifact/segment IDs, JSON Pointer or line-range locators, and per-segment SHA-256
- added source-segment JSON Schema
- parsing is gated behind upload readiness; flagged artifact sets are withheld from parsing
- upload UI now shows an evidence inventory with parser type, segment count, and source locators

These remain in progress until dependency-backed TypeScript and Next.js production build validation passes.

### User flow now enabled

`create assessment -> validate artifact set -> ready for analysis -> deterministic parse -> source-addressable evidence segments -> inspect evidence inventory`

### Validation completed in this run

- 5/5 new parser behavioral tests pass;
- source-policy lint passes across the new/modified implementation files;
- Markdown line-range, JSON Pointer, YAML section, OpenAPI classification, and fail-closed unsupported-format cases are covered;
- prior upload-readiness validation remains unchanged from the 2026-08-09 increment.

### Known limitations

- dependency-backed TypeScript/Next.js production validation is still unavailable in this runtime because external npm/GitHub hosts cannot be resolved;
- CSV, SQL DDL, and PDF parsing are intentionally not claimed complete and fail/remain partial rather than silently producing low-quality evidence;
- YAML parsing currently preserves top-level section line ranges rather than constructing a complete YAML AST; this is sufficient for evidence segmentation but not semantic extraction;
- raw artifact bytes remain transient demo-only request data and are not persisted;
- authentication, tenant authorization, private object storage, malware scanning, deletion, audit controls, and tenant-isolation validation remain required for confidential enterprise use.

### Exact next feature

Complete the parser coverage and evidence-processing surface: `PAR-003` CSV parser, `PAR-004` SQL DDL parser, `PAR-005` PDF parser, `PAR-007` processing-status UI, and `PAR-008` artifact/evidence inventory. After that, begin `EXT-001` AI provider interface and structured extraction.
