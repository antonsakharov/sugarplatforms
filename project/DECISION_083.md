# Decision 083 — Bounded PDF RunLengthDecode evidence

Date: 2026-10-21
Status: accepted for the local/demo bounded PDF adapter; not a production PDF certification

## Context

Some architecture PDFs use the standard `/RunLengthDecode` (`/RL`) stream filter for page content or directly referenced `/ToUnicode` CMaps. The current shared decoder rejects these streams even when page-tree provenance and font selection can be established. Decoding must not allow unbounded repeat expansion or produce unsupported evidence.

## Decision

1. Extend the shared, byte-faithful PDF stream decoder to support `/RunLengthDecode` and `/RL`, including correctly ordered filter chains such as `/RL` followed by `/FlateDecode`. This is not a general-purpose PDF renderer.
2. Decode literal controls 0–127 (copy `n + 1` bytes), repeat controls 129–255 (repeat next byte `257 - n` times), and require the 128 end-of-data marker. Reject truncated runs, missing EOD, and non-PDF-whitespace data after EOD.
3. Enforce existing input and per-stage output limits before any copy or expansion: 4 MiB for page content and 64 KiB for selected-font CMaps. Unknown filters, predictors, and ambiguous filter declarations remain unsupported and fail closed.
4. Preserve verified physical-page coordinates and source-backed text only; no inferred glyphs, page positions, customer records, credentials, or production access. Human extraction and finding review remain mandatory.
5. Keep production-grade PDF/OCR, object streams, CMap inheritance, canonical GitHub parity, authentic npm lockfile repair, full dependency-backed validation, and live tenant isolation as open gates.

## Verification

`tests/pdf-runlength.test.mjs` exercises independent literal-run encoding, binary data, repeat runs, 128-byte boundaries, malformed EOD/runs, output budgets, filter-order sensitivity, end-to-end page provenance, filtered CMaps, and fail-closed error handling. Existing parser and upload/tenant tests remain part of the regression gate.
