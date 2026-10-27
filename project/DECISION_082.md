# Decision 082 — Prefix-unambiguous mixed-width PDF ToUnicode codespaces

Date: 2026-10-20  
Status: Accepted for the bounded local/demo PDF adapter; production PDF certification remains open.

## Context

Some architecture PDFs declare both one-byte and two-byte source-code intervals in one `/ToUnicode` CMap. The previous fixed-width decoder rejected all mixed-width maps, even when the first source byte determines the character boundary without ambiguity. Treating all codes as two bytes or assuming ASCII would create unsupported evidence.

## Decision

1. Permit up to 16 disjoint codespace intervals of one or two bytes, including a mixture, only if no one-byte interval intersects the **first-byte prefix range** of any two-byte interval. Reject overlapping intervals of equal width, reversed bounds, malformed entries, and ambiguous prefixes. Three-byte and longer codespaces remain unsupported.
2. Parse each `bfchar` source code with its declared width; require `bfrange` endpoints to have equal widths and the entire range to fit a single declared interval. Reject overlapping mappings, unmapped characters, malformed UTF-16BE destinations, and unsupported CMap inheritance.
3. Decode literal, hex, and `TJ` operands left-to-right using the unique first-byte width. Reject truncated two-byte codes, missing first-byte prefixes, and glyphs absent from the explicit CMap. Preserve all existing text, CMap, page and upload budgets.
4. Preserve verified physical-page evidence only through the existing page-tree and selected-font checks. The feature does not enable production access, OCR, arbitrary CMap operators, PDF object streams, or unsupported font encodings.

## Verification

`tests/pdf-codespaces.test.mjs`, `tests/pdf-to-unicode.test.mjs`, and `tests/parser.test.mjs` exercise unambiguous mixed widths, literal/hex/`TJ` operands, page-backed evidence, cross-width range rejection, prefix ambiguity, truncation, unknown glyphs, and legacy single-byte compatibility. Full dependency-backed build/typecheck and live tenant isolation remain release gates.
