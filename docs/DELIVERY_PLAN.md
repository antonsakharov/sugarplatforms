# Delivery Plan

## Product strategy

Build the real limited diagnostic first. Keep the sample assessment as a parallel demonstration path, not as the core product.

## Phases

1. Deployable product shell and assessment setup.
2. Guided upload and validation.
3. Parsing and source-addressable evidence.
4. Structured extraction and human review.
5. Deterministic and AI-assisted diagnostics.
6. Entity/ID visualization.
7. Maturity, recommendations, executive report, and PDF export.

## Release gates

Do not mark a phase complete unless the user-visible workflow works end to end, build/type/lint/tests pass, limits are enforced server-side, evidence requirements are preserved, documentation is updated, and demo fixtures still work.

## Production readiness

Production activation requires verified identity, PostgreSQL/RLS, private object storage, malware quarantine, deletion/audit operations, and live tenant-isolation certification before confidential enterprise inputs.