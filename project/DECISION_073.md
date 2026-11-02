# ADR-073 — Bounded single-byte ToUnicode bfrange mappings

**Status:** Accepted (2026-10-11)

A selected PDF font may map one-byte character codes through a directly referenced, unfiltered `/ToUnicode` CMap when the document has a verified physical page tree and the mapping is unambiguous. The bounded local adapter now accepts `bfchar`, contiguous `bfrange` BMP scalar destinations, and exact-length `bfrange` destination arrays. It validates declared block counts, the one-byte codespace, every destination's UTF-16BE decoding, overlapping entries, the 256-code bound, scalar overflow and surrogate units, and missing glyph mappings. Any ambiguity fails closed rather than fabricating a character or page coordinate.

Multibyte codespaces, inherited page resources, `usecmap`, filtered CMap streams, OCR, complex font encodings, and layout reconstruction remain outside the local/demo adapter. This expansion is not a claim of production-grade PDF coverage. Full dependency-backed build/type/lint, live tenant isolation, and canonical branch synchronization remain separate release gates.
