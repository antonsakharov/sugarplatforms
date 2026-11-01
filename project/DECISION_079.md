# Decision 079 — Atomic Git Data API recovery publication

Date: 2026-10-17  
Status: Accepted for local recovery tooling; live GitHub publication and PR verification pending.

## Context

The canonical `main` branch contains the original design-only baseline, while the verified local application package contains hundreds of source files. Repeated one-file GitHub connector writes have left incomplete recovery branches. The existing `git`/`gh` fallback requires clone/push tooling that is not always available in a restricted build runner.

## Decision

1. Provide `scripts/publish-recovery-api.py`, a Python-standard-library publisher using GitHub's Git Data REST API. The default is a read-only local dry run; network writes require explicit `--publish` and a server-side `GITHUB_TOKEN`/`GH_TOKEN`.
2. Verify the complete source inventory against `recovery-manifest.json` before constructing any request. Include the manifest itself in the proposed Git tree; never upload credentials, databases, local build state, or customer artifacts.
3. Build the candidate tree from canonical `main` in bounded batches, using UTF-8 inline Git blob contents. Reject unexpected, missing, truncated, non-regular, or mismatched remote tree entries by comparing Git blob hashes before any ref write.
4. Abort if `main` changes during preparation. Only after tree parity succeeds may the publisher create a commit and a new `agent/*` branch. It must never update or force-push `main`, merge, or deploy.
5. Verify the published ref and complete tree again, then open a **draft** PR to `main` with explicit unresolved release gates. A partial publication or failed PR creation is not reported as success.
6. Keep `scripts/publish-recovery.sh` as an independent authenticated-git fallback. Neither method may bypass lockfile, dependency-backed CI, evidence integrity, or live two-tenant security gates.

## Validation and limitations

Offline fake-API tests cover successful multi-batch publication, remote mismatch, extra files, stale `main`, branch guardrails, chunk limits, duplicate/truncated trees, and draft-state enforcement. Live publication cannot be certified without working GitHub API credentials/connectivity; local tests do not establish GitHub server behavior. The npm lockfile remains incomplete and must be regenerated from authentic registry metadata before merge.
