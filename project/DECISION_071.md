# Decision 071 — Physical PDF page-tree provenance

Date: 2026-10-09
Status: Accepted

## Context

PDF objects can appear in any byte order. Previously, the bounded adapter assigned page numbers by the order in which `/Page` objects were declared, which can create incorrect evidence citations even when `/Contents` links are valid.

## Decision

Only a unique Catalog `/Pages` root and recursively validated `/Kids` traversal may establish physical page order. Child `/Parent` links, `/Count`, missing references, duplicate/cyclic nodes, and the 150-page MVP cap must be checked. Duplicate object IDs (including incremental revisions) are unsupported and rejected. Catalog-less PDFs can emit direct-text fragments but never physical page numbers. Invalid page trees fail closed. The bounded adapter still does not claim support for complex fonts/CMaps, OCR, or layout reconstruction.

## Verification

`node --experimental-strip-types --test tests/parser.test.mjs` exercises reversed declaration order, nested page trees, incorrect count, repeated/cyclic/missing children, invalid parents, duplicate object IDs, and catalog-less fragments.
