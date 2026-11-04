# Decision 099 — Bounded indirect PDF xref-stream Length (2026-11-04)

**Decision:** Support only `/Length N 0 R` where N is a distinct, live, indexed, generation-zero direct object containing one unsigned decimal integer between 1 and 65536. Require the encoded xref stream to have exactly that length. Do not interpret arbitrary indirect values, generation changes, or compressed targets.

**Reason:** Legitimate PDF 1.5 xref streams may store encoded length indirectly; treating an unproven reference as valid would permit stream boundary confusion and fabricated evidence.

**Scope:** Local/demo parser only. Existing assessment and upload limits, architecture-metadata-only policy, original byte offsets, evidence provenance and tenant security gates are unchanged. No production deployment.
