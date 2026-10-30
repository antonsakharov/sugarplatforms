# Decision 070 — Bounded PDF text decoding and output limits

Date: 2026-10-08
Status: Accepted

## Context

PDF strings may be literal, hex, or array operands, and literal escapes include octal bytes and line continuations. Treating an unknown high-bit glyph byte as Latin-1 text invents evidence. Compressed streams can also expand far beyond their uploaded size.

## Decision

The local parser accepts printable ASCII operands and explicitly BOM-tagged UTF-16BE text; parses PDF literal and hex string syntax and `TJ` arrays; rejects undecodable glyphs and malformed strings; and caps each decoded content stream at 4 MiB. Proven page-to-content references remain necessary for page locators. Full font CMap, OCR, and layout parsing remain out of scope for the bounded adapter.

## Verification

`node --experimental-strip-types --test tests/parser.test.mjs` covers nested/escaped strings, UTF-16BE, mixed `TJ`, invalid glyphs, malformed hex, and a compressed expansion cap.
