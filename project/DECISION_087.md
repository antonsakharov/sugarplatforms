# Decision 087 — Authenticated npm lock recovery and transitive supply-chain gate

Date: 2026-10-25  
Status: Accepted for local source recovery; networked dependency installation and release certification remain pending.

## Context

The approved source snapshot pinned `better-sqlite3@12.10.1` in `package.json`, but `package-lock.json` lacked both the root dependency declaration and the package's transitive closure. Consequently `npm ci` could not validate the canonical source even when package registry access was available. The current build runner has no outbound npm tarball access.

## Decision

1. Recover the **published npm v3 lockfile records**, including SHA-512 SRI integrity values, for `better-sqlite3@12.10.1` and its 36 missing transitive packages from the publicly versioned GitHub source `oliverjessner/sqlite-hub`, commit `818a59e3b68fd377cda6f474b12dd1a44b64c6f2`, `package-lock.json`. Do not invent integrity hashes. The source commit contains the exact native package version and published tarball integrity; existing compatible root `detect-libc@2.1.2` and `semver@7.8.5` records remain pinned and are promoted to required dependencies.
2. Require every installed lockfile package to use the exact npm registry tarball URL, a valid 64-byte SHA-512 SRI value, and an explicit pinned version. Reject malformed package paths and missing required transitive packages. Keep this preflight dependency-free so it runs before `npm ci`.
3. Preserve the application dependency versions, domain contracts, upload limits, architecture-only input policy, and security boundaries. This is a build-integrity improvement, not a new runtime feature or an authorization change.
4. Validate with `node scripts/check-baseline.mjs`, the baseline regression suite, and `npm ci --offline --ignore-scripts --dry-run` for npm's lock consistency. An offline dry run **does not install packages**, prove that the referenced tarballs match their SRI hashes, or replace clean `npm ci`, type checking, tests, and build in networked CI.
5. Do not merge or deploy until GitHub source parity, actual dependency installation, full validation, and live two-tenant storage/database/malware isolation are verified.

## Remaining risks

The published-lockfile source is independent of the npm registry, but is not a direct registry attestation. A networked `npm ci` must fetch and verify the tarballs against their SRI hashes. Native SQLite compilation/prebuild compatibility must be exercised on the target Node runtime. Production security certification remains separate.
