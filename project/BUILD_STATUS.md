# Build Status

## 2026-08-13

### Implemented in this increment

- [-] EXT-008 extraction review screen
- [-] EXT-009 rename, reject, same-kind merge, confirm, evidence drill-down, and explicit extraction approval
- [-] EXT-010 untrusted-instruction and malformed-output boundary tests
- workspace progress now routes from extracted candidates into review and shows approval state
- review decisions remain local/demo state and preserve the original evidence-linked extraction object IDs

### User flow now enabled

`create assessment -> upload -> validate -> parse -> inspect evidence -> extract architecture candidates -> review each candidate -> rename/reject/merge/confirm -> approve extraction for diagnostics`

### Validation state

Feature code and focused tests are committed. Dependency-backed TypeScript, lint, test, and optimized Next.js build validation must pass in GitHub Actions before these items are marked complete.

### Security and evidence posture

- extraction approval is blocked while any candidate remains pending;
- merge is explicit and allowed only between objects of the same kind;
- rejected and merged-away objects remain represented in review history;
- renaming does not rewrite source evidence or extraction identity;
- malformed extraction objects without evidence fail closed;
- untrusted source instructions do not cause the deterministic adapter to emit unsupported architecture facts;
- demo review state is browser-local and is not suitable for confidential multi-user use.

### Known limitations

- review decisions are not yet durable tenant-scoped records;
- authentication, RLS, private object storage, malware controls, audit/deletion, and tenant-isolation testing remain required for confidential enterprise use;
- OpenAI extraction remains an inactive adapter boundary in demo mode;
- diagnostics, findings review, entity/ID visualization, recommendations, and reporting are not yet implemented.

### Exact next feature

After validation, begin `DIA-001` with a deterministic diagnostic rule framework consuming only an approved extraction review. The first evidence-backed rule should detect ownership gaps or fragmented identifiers without introducing unsupported inference.

## 2026-10-10 local increment

PDF `ToUnicode` one-byte `bfchar` evidence decoding is implemented and regression-tested (35/35 parser tests; 46/46 parser/upload/graph tests). Full suite is 147/171 due to 24 unavailable-dependency failures; full build/type/lint and live tenant certification remain open. Canonical `main` still contains the design-only baseline; a recovery branch exists but is behind this local package. The full 2026-10-10 ZIP is the authoritative working-copy backup pending reviewed synchronization. Next: reconcile canonical recovery, synchronize npm lockfile and certify CI; then extend font CMap coverage without weakening provenance.

## 2026-10-15 — Baseline integrity recovery increment

Implemented `scripts/check-baseline.mjs` and seven tests to fail closed on missing approved documents, lockfile drift, missing dependency entries, malformed JSON, and symlinked baseline files. Reconciled deterministic Node engine metadata in `package-lock.json`, added `baseline:check`, switched the local CI definition from `npm install` to `npm ci`, and added a draft-recovery preflight warning. User-visible diagnostic flow is unchanged; this increment makes restoration and reproducibility auditable.

Local focused checks: 99/99 pass; full suite: 200 pass, 24 fail (missing npm packages and Node module-resolution). Source lint and 19 schema JSON syntax checks pass. Baseline gate is intentionally red for missing `better-sqlite3@12.10.1` lockfile metadata. Build/typecheck and live tenant isolation are not certified.

GitHub: `agent/canonical-baseline-gate-2026-10-15` created from the October 14 recovery branch; a reduced baseline checker and ADR-077 were published. Connected write-safety blocked publishing the full local implementation and creating a draft PR. Branch is incomplete and not merge-ready. No deployment.

Next: restore the complete October 15 backup on a reviewable agent branch, regenerate the lockfile with real registry metadata, then certify npm ci, full build/type/lint/tests and live two-tenant isolation before resuming broader PDF font/OCR support.

### 2026-10-26 — PAR-005b13 local PDF object-stream support
Implemented and locally validated strict Flate `/ObjStm` dictionary expansion with verified page evidence (Decision 090). Focused PDF tests pass; full dependency-backed validation must be run in GitHub Actions. Live non-BYPASSRLS tenant isolation remains blocked. No deployment or merge.

### 2026-10-29 — PAR-005b16

Bounded classic PDF trailer `/Info` and `/ID` compatibility is implemented with six new regression cases and no change to upload limits or report evidence policy. Main remains design-only; publish the full manifest-verified application to a dedicated draft PR. Networked CI and live managed two-tenant isolation remain separate release checks.
