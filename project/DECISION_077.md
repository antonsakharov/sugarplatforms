# ADR-077 — Canonical baseline and dependency lockfile gate

**Date:** 2026-10-15  
**Status:** Accepted for repository recovery; release remains blocked.

## Context

Canonical `main` remains a design-only baseline while the approved October 14 application backup includes the full local/demo workflow. The recovery branches do not yet match the latest backup. The local `package.json` pins `better-sqlite3@12.10.1`, but `package-lock.json` does not contain that direct dependency, and its root Node engine constraint also differed (corrected as deterministic root metadata in this increment). The offline environment cannot download native package metadata. Treating `npm install` as an acceptable CI substitute would conceal non-reproducible dependencies.

## Decision

Add a dependency-free, read-only baseline preflight (`scripts/check-baseline.mjs`) that verifies all required product/design/security/decision documents, npm lockfile v3 structure, root package metadata, Node engine constraint, direct dependency declarations, installed package entries, pinned versions, and validation commands. Run the gate before `npm ci` in CI; do not silently regenerate the lockfile during CI. Add regression tests for absent documents, stale dependencies, missing entries, mismatched versions, and malformed lockfiles. The manual recovery publisher reports a failed preflight but may still create a **draft** recovery PR, because publishing missing baseline files is itself part of the repair. No auto-merge or deployment.

## Consequences

The approved local package now has an actionable, machine-readable baseline/lockfile report and a reproducibility guard. Today's source backup deliberately fails this gate for the missing native SQLite lockfile entry. A networked environment must regenerate the lockfile with authentic npm metadata, commit it, run `npm ci` and the full build/type/lint/tests, and verify live tenant isolation before merge or confidential production use. This gate does not replace runtime tests, PDF evidence verification, or source review.
