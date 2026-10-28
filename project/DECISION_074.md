# ADR-074 — Inherited PDF page font resources are resolved nearest-first

**Status:** Accepted (2026-10-12)

The bounded PDF parser may use a one-byte `/ToUnicode` font CMap from the nearest explicit `/Resources` declaration on the page or any ancestor `/Pages` node in a previously verified page tree. Direct and indirect `/Resources` and `/Font` dictionaries are supported. A page declaration overrides inherited resources; invalid declarations must fail closed rather than silently falling back to a parent or an assumed encoding.

Selected font names must exist in the resolved resource dictionary. Missing, duplicate, malformed, cyclic, unsupported or unmapped font resources may not become architecture facts or page-backed evidence. Resource traversal is bounded to the 150-page MVP maximum and never reads external files. This does not authorize multibyte CMaps, filtered CMaps, complex embedded fonts, OCR, or production PDF support.

**Validation:** Focused parser/font tests exercise direct/indirect inheritance, nested override precedence, missing fonts, invalid resource overrides, duplicate declarations, missing references and cycles. Dependency-backed release certification and live tenant-isolation checks remain separate gates.
