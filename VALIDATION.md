# Validation status

## 2026-08-15 finding review increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- finding evidence must resolve to direct evidence inside the exact approved extraction boundary;
- affected object IDs must refer only to confirmed extraction objects;
- a stale diagnostic/extraction approval combination is rejected;
- every finding must receive an explicit accept/reject decision before review completion;
- editing a finding returns it to pending review;
- reviewer edits cannot change rule identity, confidence, affected objects, evidence, or provenance;
- only accepted findings from a completed non-stale review are exposed to downstream consumers;
- the finding-review JSON schema parses successfully;
- TypeScript, source-policy lint, tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior deterministic diagnostics validation

The 2026-08-14 increment passed 36/36 Node behavioral and contract tests, source-policy lint, JSON schema parsing, TypeScript, and optimized Next.js build in GitHub Actions. Diagnostics are gated on approved extraction, rejected/merged extraction candidates are excluded, and every emitted deterministic finding carries direct evidence and rule provenance.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable findings/review persistence, review authorization, deletion, audit events, log redaction, backup/restore, and tenant-isolation tests remain mandatory before confidential enterprise artifacts can be accepted.
