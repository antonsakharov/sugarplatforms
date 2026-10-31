# ADR-075 — Fixed-width two-byte PDF ToUnicode decoding

**Status:** Accepted — 2026-10-13

## Context

The bounded local PDF adapter already proves page-tree order, page content references, and selected-font ToUnicode mappings for one-byte character codes. Architecture documents can use two-byte CIDs even when a direct, unfiltered ToUnicode CMap makes every glyph's meaning explicit. Treating those bytes as independent one-byte codes is incorrect; guessing would corrupt evidence.

## Decision

Permit a *single fixed-width* one- or two-byte codespace per direct unfiltered ToUnicode CMap, with explicit `bfchar`, BMP scalar `bfrange`, and exact-length `bfrange` destination arrays. Two-byte source codes are interpreted as unsigned big-endian integers. PDF literal and hexadecimal operands and `TJ` arrays must consume complete code units. Reject odd-length operands, unmapped codes, conflicting ranges, mixed-width codespaces, unsupported inheritance (`usecmap`), and unsupported CMap constructs. Keep the existing verified `/Catalog → /Pages → /Kids → /Page → /Contents` provenance boundary.

Enforce a 64 KiB CMap source limit, at most 1,024 glyph mappings, at most 64 UTF-16 code units per mapped glyph, a 4 MiB decoded PDF stream budget, and a 1 MiB decoded-text budget per text block. No customer records or live production access are introduced.

## Consequences

The credential-free local/demo workflow can now extract metadata from a bounded subset of two-byte-font architecture PDFs while retaining evidence locators. This is **not** a production-grade PDF/OCR parser. Mixed-length CMaps, embedded/filtered CMaps, complex font shaping, tagged PDF, scanned documents, and layout reconstruction remain unsupported. Production use remains blocked on dependency-backed CI, canonical repository synchronization, and live tenant-isolation certification.
