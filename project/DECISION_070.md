# Decision 070 — Bounded PDF text decoding and output limits

Date: 2026-10-08
Status: Accepted

PDF strings may be literal, hex, or array operands. The local parser must support PDF octal escapes, nested literal parentheses, line continuations, explicit UTF-16BE BOM, and TJ arrays without manufacturing evidence. Unknown high-bit glyph bytes without a proven font/CMap mapping, malformed operands, and decoded streams above 4 MiB must fail closed. Exact page locators require explicit /Page to /Contents references; otherwise only honest fragment locators are permitted. Full CMap, OCR, and layout reconstruction remain production-adapter work.

Verification: node --experimental-strip-types --test tests/parser.test.mjs (20/20 locally on 2026-10-08). Full dependency-backed build/typecheck is not certified.