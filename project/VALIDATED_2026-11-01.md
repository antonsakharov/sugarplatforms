# Validation record — 2026-11-01

## Feature

PAR-005b19: bounded PDF 1.5 xref-stream dictionary and `startxref` whitespace/comment compatibility (Decision 096).

## Scope and tests

- Normalize only bounded lexical header/trailer regions for parsing, never source offsets or stream bytes.
- Eight new positive/adversarial regressions for comments, CR/LF/NUL/FF/HT, `/Info`/`/ID` evidence separation, offset/index parity, malformed fields, revisions and terminal data.
- Existing MVP limits, malware quarantine, authorization, source evidence and demo flow unchanged.

## Local validation

- Xref-stream regression suite: **25/25 passed**.
- Focused PDF/upload/graph suites: **164/164 passed**.
- Source lint: **passed**.
- Full test suite: **331 passed, 24 failed** due to missing installed dependencies in the isolated runner.
- `npm ci`: **failed** in the restricted runner (npm exit-handler failure); TypeScript type libraries unavailable; Next.js production build cannot run locally.
- JSON schema syntax, source manifest, deterministic ZIP integrity: verified after documentation update.
- Live authenticated non-bypass two-tenant managed PostgreSQL/RLS, private storage and malware-scanner tests: **not run** (no provisioned services).

## Publication/release gate

Publish complete hash-verified source to a dedicated draft branch/PR, verify GitHub CI for the new commit independently, and do not merge or deploy. A passing CI workflow does not establish confidential production security certification.
