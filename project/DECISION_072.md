# ADR-072 — A PDF glyph needs a selected, explicit ToUnicode mapping

**Status:** Accepted (2026-10-10)

The bounded PDF parser may decode one-byte high-bit glyphs only when the page directly declares a font resource, the text stream selects that font with `Tf`, and the font directly references a readable, unfiltered `/ToUnicode` CMap with one explicit one-byte `begincodespacerange` and validated `beginbfchar` entries. Each text byte must have an explicit mapping. Mapped ASCII codes must use the mapping rather than their apparent byte value. Unsupported ranges, multibyte CIDs, filtered or inherited CMaps, duplicate/malformed mappings, and unmapped bytes fail closed. No font mapping is inferred from filenames, font names, page order, or nearby objects.

This is a narrow local/demo evidence correctness increment, not production-grade PDF parsing. It retains the page-tree provenance invariant in ADR-071, the decoded-stream bound in ADR-070, and the architecture-metadata-only and 150-page MVP constraints. Full font/CMap coverage, OCR, layout reconstruction, and dependency-backed release validation remain open.
