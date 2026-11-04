# Decision 080 — Disjoint fixed-width PDF ToUnicode codespaces

Date: 2026-10-18  
Status: Accepted for the bounded local/demo PDF adapter; production PDF certification remains open.

## Context

Real-world ToUnicode CMaps may declare more than one codespace interval even when all character codes have the same byte width. The prior decoder accepted only one interval, rejecting otherwise unambiguous architecture text and preventing extraction with page-backed evidence.

## Decision

1. Accept one `begincodespacerange` block declaring 1–16 **disjoint** intervals, all exactly one byte or all exactly two bytes wide. Unsorted intervals are valid; overlapping, reversed, mixed-width, malformed, or miscounted entries are rejected.
2. Preserve the existing fixed-width decoder contract. A glyph's code must belong to a declared interval. A `bfrange` mapping must fit **entirely within a single interval**; crossing a gap or interval boundary is rejected, even if both endpoints are otherwise declared.
3. Retain the 64 KiB CMap, 1,024 glyph, and per-glyph Unicode/output budgets. Do not synthesize unmapped characters or page coordinates. Any unsupported CMap feature (mixed-width codespaces, `usecmap`, object streams, OCR, layout reconstruction) still fails closed.
4. Preserve the existing source-addressed evidence and human review boundaries; no new production access, secrets, records, or external services.

## Verification

Standalone parser tests cover single- and two-byte multi-interval CMaps, gaps, crossing ranges, overlaps, mixed widths, malformed counts and excessive intervals. An end-to-end PDF fixture verifies selected-font decoding and physical-page evidence. Dependency-backed full build/typecheck and production PDF/tenant certification remain release gates.
