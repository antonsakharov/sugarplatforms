# Validation status

## 2026-08-17 maturity and recommendation increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- maturity and recommendations are blocked until finding review is completed;
- stale finding review is rejected before downstream projection;
- only accepted findings may influence maturity or recommendations;
- zero accepted findings returns `not_scored` rather than a perfect maturity score;
- the focused maturity signal is bounded to 1–5 and exposes severity weights, concentration penalty, dimension rationale, and scope limitations;
- rejected findings cannot appear in recommendation traceability;
- recommendations are deterministically ranked by severity, confidence, then title;
- every recommendation preserves finding IDs, affected object IDs, and direct evidence references;
- the maturity/recommendation JSON schema parses successfully;
- TypeScript, source-policy lint, tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-16 entity/ID map increment passed its GitHub Actions validation, including TypeScript, lint, behavioral/contract tests, schemas, and optimized Next.js production build. The map consumes confirmed extraction objects and accepted findings from a completed non-stale review.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation persistence, review authorization, deletion, audit events, log redaction, backup/restore, and tenant-isolation tests remain mandatory before confidential enterprise artifacts can be accepted.
