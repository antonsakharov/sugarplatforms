# Decision 078 — Source-only recovery manifests and reproducible ZIPs

Date: 2026-10-16
Status: Accepted for the local approved recovery package; canonical publication pending.

## Context

Canonical `main` still contains only four design files, while the approved local application package has more than 300 source files. Earlier recovery branches are incomplete and some prior ZIPs included generated TypeScript state. A successful upload of a handful of files is not proof that a GitHub branch matches the approved application.

## Decision

1. Inventory publishable source files using `scripts/recovery-snapshot.mjs` without network access or dependencies. Record SHA-256 content hashes and Git blob SHA-1 IDs, sorted paths, counts, and a SHA-256 tree commitment in `recovery-manifest.json`.
2. Exclude local credentials, databases, logs, generated state, and build/cache directories; reject unexpected file types, symlinks, and excessive source budgets. Do not inspect or upload customer artifacts.
3. Require manifest verification before the manual GitHub recovery script copies files. Copy only manifest-listed files; rehash them before copying.
4. Build deterministic ZIPs with `scripts/package-recovery.py` from the verified manifest. Include the manifest in the archive and rehash every file immediately before inclusion. Never delete `.git`, `node_modules`, or `.next` to package a snapshot.
5. Compare the local manifest against the GitHub recursive tree (`scripts/recovery-snapshot.mjs compare`) before declaring a branch synchronized. Missing, extra, changed, symlinked, or truncated remote content is a failed parity gate.
6. Keep the draft PR unmergeable until the complete source, authentic npm lockfile, dependency-backed CI, and live tenant-isolation checks pass. No automatic merge or deployment.

## Rejected alternatives

- Inventing native dependency integrity values to make `npm ci` appear green.
- Treating branch creation or a partial source push as canonical recovery.
- Backing up arbitrary runtime directories or `.env` files.
- Requiring external GitHub credentials to generate a local source backup.

## Remaining limitations

The manifest proves byte-level source parity, not runtime correctness, supply-chain trust, or live multi-tenant isolation. The local runner cannot reach npm or GitHub via git, and `better-sqlite3@12.10.1` is still missing from the lockfile. The connected GitHub tool may still block file writes and draft PR creation.
