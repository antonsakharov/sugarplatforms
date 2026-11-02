# Validation record — 2026-11-02

## Feature

PAR-005b20: PDF 1.5 xref-stream zero-width `/W` default-field compatibility (Decision 097).

## Scope and tests

- PDF-defined omitted type/offset/generation/index defaults with nonzero total stride and bounded width.
- Eight positive/adversarial regressions for verified direct page evidence, comments and metadata exclusion, object zero, absent offsets, compressed index ambiguity, invalid widths, offset tampering and exact decoded stride.
- Existing physical page-tree proof, one-revision rejection, MVP upload policy, malware gate, authorization and evidence review unchanged.

## Validation

- Local focused xref-stream suite: **33/33 passed**.
- Focused PDF/parser/upload/graph suites: **208/208 passed**.
- Full local suite: **340 passed, 23 failed** due to unavailable npm dependencies in this isolated runner.
- Source lint, baseline check, source manifest verification and 19 JSON schema syntax checks: **passed**.
- Full TypeScript check: **blocked** by missing installed dependencies (`zod`, React/Next types); Next.js production build: **blocked** (`next` unavailable).
- GitHub CI results must be checked independently after publication; do not infer release certification from focused tests.
- Live authenticated non-bypass managed PostgreSQL/RLS, private object storage and malware-scanner isolation: not executed without provisioned services.

## Publication/release gate

Publish the full manifest-verified source to a dedicated draft GitHub PR, verify CI independently, and do not merge or deploy. Production confidential-data readiness remains blocked on live security certification.
