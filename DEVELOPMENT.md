# Development

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The credential-free local/single-instance path uses the server-owned local tenant, local-dev authenticated membership, SQLite persistence adapters, private filesystem artifact storage, and the local deterministic malware scanner. No external identity provider, PostgreSQL service, object-storage account, AI provider, PDF provider, or malware-scanner service is required to exercise the current end-to-end workflow locally.

Do not use the local adapter for confidential enterprise material. Production readiness still requires verified production identity, PostgreSQL/RLS activation with live non-bypass tenant-isolation tests, production private object storage, live malware-scanner operations, PostgreSQL/RLS-backed audit/deletion with retention and backup semantics, backup/restore verification, and log/incident controls.

## Validation

```bash
npm run validate
```

`npm run validate` runs TypeScript checks, source-policy lint, all Node tests, and an optimized Next.js production build. GitHub Actions also packages the validated source tree as a repository-snapshot artifact after each run.

Current tests cover assessment limits and persistence, assessment deletion/audit lifecycle, authentication/authorization, organization/workspace isolation, PostgreSQL RLS policy boundaries, upload safety, malware quarantine ordering/provider behavior, private artifact storage, deterministic parsing, source-addressable evidence persistence, extraction/review persistence and staleness, deterministic diagnostics, finding-review persistence/materialized accepted findings, AI candidate boundaries and promotion, entity/ID graph projection/export, maturity/recommendation projection, accepted-findings-only reporting, report snapshot/version export, formal print presentation, and deterministic PDF generation/provenance behavior.

## Malware scanner configuration

Local/demo runs default to `MALWARE_SCANNER_PROVIDER=local`. This exercises the quarantine contract with bounded EICAR/executable signatures and is not production antivirus coverage.

For a production-style ClamAV service:

```env
MALWARE_SCANNER_PROVIDER=clamav
CLAMAV_HOST=clamav.internal
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=10000
```

ClamAV must be reachable only from trusted application infrastructure and should not expose port 3310 publicly. Scanner timeout, outage, or unrecognized output fails upload closed; there is no bypass-to-storage path.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — assessment workspace, including the administrator deletion danger zone
- `/assessment/[id]/upload` — upload, malware quarantine/readiness, parsing, evidence, and extraction workflow
- `/assessment/[id]/review` — server-backed extraction review and approval
- `/assessment/[id]/diagnostics` — deterministic diagnostics and server-backed finding review
- `/assessment/[id]/ai-findings` — isolated candidate findings and explicit server-authorized promotion into normal finding review
- `/assessment/[id]/map` — server-reviewed entity/ID projection, evidence drill-down, filters, and static export
- `/assessment/[id]/maturity` — server-reviewed maturity signal and prioritized recommendations
- `/assessment/[id]/report` — server-reviewed executive preview, durable immutable report history, JSON export, print, and authorized formal PDF export
- `/api/assessments` — authenticated assessment validation/creation
- `/api/assessments/[id]` — authenticated assessment read; admin-only `DELETE` permanently purges the assessment and returns an audit receipt
- `/api/assessments/[id]/artifacts` — authenticated validation, malware quarantine, private storage, parsing, extraction, and processing persistence
- `/api/assessments/[id]/processing` — authenticated no-store processing snapshot
- `/api/assessments/[id]/extraction-review` — authenticated extraction-review read/write
- `/api/assessments/[id]/finding-review` — authenticated finding-review read/write and accepted-finding materialization
- `/api/assessments/[id]/ai-promotions` — authenticated explicit AI-candidate promotion into a pending server-persisted finding set
- `/api/assessments/[id]/reports` — authenticated durable report-history read/create
- `/api/assessments/[id]/audit` — admin-only tenant-scoped deletion audit receipts, including after successful deletion
- `/api/auth/session` — current server-resolved local authenticated context
- `/api/tenancy` — current server-resolved tenant context
- `/api/reports/pdf` — bounded authorized PDF export from one persisted saved report snapshot
- `/api/health` — health endpoint

## Assessment and upload limits

The MVP remains deliberately bounded:

- one active focused assessment per workspace;
- one primary business entity;
- up to 10 files;
- up to 25 MB per file;
- up to 150 total measurable pages;
- architecture metadata only;
- no customer/patient/payment records;
- no passwords, tokens, API keys, private keys, credentials, or other secrets;
- no raw production database exports or live production-system access.

Validated artifact bytes are persisted only after upload-readiness and malware-quarantine checks pass, under server-derived random tenant-scoped private storage keys. Validated artifact metadata, parser/source segments, extraction snapshots, extraction review, finding review, materialized accepted findings, and report snapshots are server-persisted in the current local/single-instance adapter.

## Reviewed-state authority

The browser is no longer authoritative for reviewed findings downstream. `lib/client-reviewed-state.ts` hydrates the current assessment, processing snapshot, extraction approval, diagnostic envelope, finding review, and materialized accepted findings through authenticated `Cache-Control: no-store` APIs. It verifies assessment scope, approved extraction, stale state, completed review, and accepted-finding materialization before maturity, map, recommendations, or report projections run.

Only after successful server hydration does the client refresh legacy `localStorage` keys used as compatibility caches. A stale, missing, unauthorized, or incomplete server review fails closed; downstream surfaces do not fall back to old browser findings.

## Diagnostics and finding review

Resolve every extraction candidate and approve the current extraction set before diagnostics. The deterministic engine validates all finding evidence and affected-object references against that approved extraction boundary. Reviewers may edit presentation fields and severity, add reviewer notes, and explicitly accept/reject findings, but rule identity, confidence, affected objects, and source evidence remain immutable.

Finding-review state is tenant-scoped and server-persisted. Accepted findings are materialized only after explicit review completion with no pending decisions. Those accepted findings are the sole finding authority for maturity, visualization, recommendations, and reports.

## AI-assisted candidate findings and promotion

The current candidate generator is a deterministic local provider that exercises the AI-provider/evidence contract without external credentials. `/assessment/<id>/ai-findings` first hydrates the current server diagnostic and extraction-review state. Candidate envelopes are browser-local suggestions and are bound to that exact diagnostic timestamp and extraction approval.

Promotion is not browser-authoritative. `POST /api/assessments/<id>/ai-promotions` revalidates the candidate envelope against the current approved extraction and exact server-persisted diagnostic set, converts the selected candidate into a pending normal finding, resets finding review, and persists the new diagnostic/review envelope. The old candidate set is discarded client-side because promotion changes the diagnostic version.

## Entity/ID map, maturity, recommendations, and report

After finding review is explicitly completed, `/map`, `/maturity`, and `/report` hydrate server-reviewed state directly. The map remains a projection rather than an inference engine; source-backed relationships retain evidence and derived relationships remain labeled. Maturity remains a focused 1–5 risk-adjusted signal rather than an enterprise certification; zero accepted findings return `not_scored`. Recommendations preserve finding/object/evidence traceability.

The executive report preview reloads server-reviewed state and persisted validated artifact metadata, then regenerates maturity, recommendations, and the 90-day plan from the same diagnostic version. Raw uploaded artifact content is not reproduced in the report.

## Report snapshots, JSON, print, and PDF

Use **Save report version** to create an immutable tenant-scoped server snapshot, **Download JSON** for structured export, **Print preview** for browser print/save-to-PDF, and **Download formal PDF** for the product-managed server PDF adapter. PDF generation accepts only assessment/report IDs and reloads the authorized persisted snapshot server-side.

## Assessment deletion and audit

Full assessment deletion is administrator-only. `DELETE /api/assessments/<id>` resolves tenant scope server-side, records a deletion request, removes private artifact objects, then transactionally purges source/evidence, extraction/review, finding-review, report, artifact-metadata, and assessment state. Minimal success/failure audit receipts remain tenant-scoped after deletion and can be read only by administrators through `/api/assessments/<id>/audit`.

The local filesystem + SQLite adapter cannot provide a distributed transaction. Storage failure therefore fails closed and leaves relational assessment state intact. Production requires idempotent object deletion, retry/reconciliation job state, PostgreSQL/RLS-backed audit records, and retention/backup deletion guarantees.

### Bounded PDF evidence adapter (2026-10-08)

Local/demo PDF extraction handles only directly provable text operands and page references. For text requiring font CMaps, OCR, unsupported filters, or >4 MiB decoded content streams, provide an alternate supported architecture-metadata file (Markdown, JSON/YAML, CSV, SQL DDL) or integrate a production PDF parser that preserves source coordinates. Never treat missing PDF extraction as a negative architectural finding.

## PDF page-tree regression validation (2026-10-09)

Run `node --experimental-strip-types --test tests/parser.test.mjs`. Test fixtures must include a Catalog/Pages/Kids hierarchy before asserting `pdf-page` coordinates; otherwise assert `pdf-text-fragment`. Invalid page trees must fail closed.

The offline npm lockfile regeneration command fails with `ENOTCACHED` for `better-sqlite3`; do not manually invent integrity hashes. Use a networked development environment with a compatible Node.js runtime to regenerate the lockfile, run `npm ci`, then `npm run validate` before merge.

## PDF ToUnicode local/demo coverage (2026-10-10)

The bounded PDF parser supports direct, unfiltered, one-byte `/ToUnicode` `bfchar` maps on a font selected by `Tf`. It does **not** infer Unicode from an unknown font encoding or support `bfrange`, multibyte CIDs, inherited resources, compressed CMap streams, OCR, or layout reconstruction. Use the production PDF adapter for those documents. Run `node --experimental-strip-types --test tests/parser.test.mjs` for focused validation. Full `npm run validate` requires a synchronized lockfile and installed dependencies (`next`, `zod`, `better-sqlite3`, React, TypeScript), which are not available in the current offline runner. Do not deploy or process confidential artifacts until the production security gates pass.

## 2026-10-11 local PDF CMap development note

`lib/pdf-to-unicode.ts` is a dependency-free, fail-closed, one-byte `/ToUnicode` decoder for direct font resources. The local parser now handles `bfchar`, BMP scalar `bfrange`, and explicit destination arrays, but **not** multibyte codespaces, inherited resources, filtered CMap streams, or OCR. Run `node --experimental-strip-types --test tests/parser.test.mjs` to verify this bounded slice without npm dependencies. Full validation requires a synchronized lockfile and installed `next`, `zod`, and `better-sqlite3` packages; do not use a demo-only parser for confidential production materials.

### 2026-10-12 — PDF inherited font resources
Run `node --experimental-strip-types --test tests/pdf-font-resources.test.mjs tests/parser.test.mjs tests/pdf-to-unicode.test.mjs` to validate nearest-first `/Resources` inheritance, indirect dictionaries, invalid overrides and exact page provenance. This bounded local parser is not a production PDF/OCR service. `npm ci` remains blocked until the lockfile includes the pinned native `better-sqlite3` package and network/dependency availability is restored.

### Manual GitHub recovery fallback
If connected GitHub writes are blocked, review the complete backup and run `scripts/publish-recovery.sh` from the extracted package on a workstation with authenticated `git` and `gh`. The script clones canonical `main` into a temporary directory, stages the complete sanitized application on a dedicated `agent/*` branch, and **defaults to a dry run**. Set `SUGAR_PUBLISH_CONFIRM=YES` only after reviewing the staged changes to publish and open a draft PR. It never force-pushes, merges, or deploys.

### 2026-10-13 — Bounded two-byte PDF CMap validation
Run `node --experimental-strip-types --test tests/pdf-to-unicode.test.mjs tests/pdf-font-resources.test.mjs tests/parser.test.mjs` for dependency-free parser validation. Fixed-width two-byte glyph codes use big-endian byte pairs; odd operands, unknown glyphs, mixed-width codespaces, and unsupported CMap inheritance fail closed. This is a demo adapter, not full PDF/OCR support. For a full release gate, first synchronize the approved package to GitHub, regenerate the stale `package-lock.json` with network access (pinned `better-sqlite3` is absent), then run `npm ci && npm run validate` and live two-tenant security tests. Never invent package integrity hashes or deploy on partial validation.

## 2026-10-14 filtered PDF CMap local verification

The shared PDF filter adapter (`lib/pdf-stream-filters.ts`) has no third-party runtime dependencies. For focused offline checks run:

```sh
node --experimental-strip-types --test tests/pdf-stream-filters.test.mjs tests/parser.test.mjs tests/pdf-font-resources.test.mjs
```

Before a production build, reconcile this full package with the canonical GitHub recovery branch, regenerate and commit a matching npm lockfile on a networked Node 22 machine (`npm install --package-lock-only`, then `npm ci`), and pass `npm run validate`. Do not deploy while the native `better-sqlite3` dependency or live tenant-isolation checks remain uncertified. No live production-system access is needed for local/demo parsing.

## 2026-10-15 — Canonical baseline and dependency certification

Run `npm run baseline:check` or `node scripts/check-baseline.mjs --json` from the extracted full repository. The checker is dependency-free, read-only, and must pass before `npm ci` and `npm run validate`. The October 15 approved working package currently fails because `better-sqlite3@12.10.1` is missing from the lockfile root. The Node engine constraint was safely reconciled to `>=20.20.2` without inventing package integrity data. **Do not** edit lockfile integrity fields by hand or claim dependency-backed validation. On a networked compatible development machine run `npm install --package-lock-only --no-audit --no-fund`, verify `npm run baseline:check`, then `npm ci && npm run validate`. Commit the real regenerated lockfile on the recovery branch.

`./scripts/publish-recovery.sh agent/recover-complete-2026-10-15` is a dry run by default. It prints the baseline preflight status and staged diff, then requires `SUGAR_PUBLISH_CONFIRM=YES` to push a draft PR. A failed preflight is acceptable only for an explicitly blocked **draft** recovery PR, never for merge or production.

## Reproducible canonical recovery (2026-10-16)

From the approved local source directory, run:

```sh
npm run recovery:manifest
npm run recovery:verify
python3 scripts/package-recovery.py --root . --manifest recovery-manifest.json --output sugar-platform-diagnostic-YYYY-MM-DD.zip
```

The manifest contains SHA-256 and Git blob SHA-1 identifiers for every publishable source file; the ZIP contains only those files plus `recovery-manifest.json`. Private `.env*` files (except `.env.example`), local databases, caches, symlinks, unknown file types and generated TypeScript state are excluded or rejected. Do not add customer artifacts or secrets to the source tree.

For an exact comparison against the canonical GitHub branch, obtain its complete recursive tree using an authenticated GitHub client and run:

```sh
gh api 'repos/antonsakharov/sugarplatforms/git/trees/main?recursive=1' > github-tree.json
node scripts/recovery-snapshot.mjs compare . github-tree.json
```

A nonzero exit means the remote branch is **not** synchronized. Compare a proposed recovery branch in place of `main` before marking a PR merge-ready. To publish manually, review the complete staged diff first, then run `SUGAR_PUBLISH_CONFIRM=YES bash scripts/publish-recovery.sh agent/recover-complete-2026-10-16` only in a GitHub-authenticated environment. It does not merge or deploy. `npm ci` must not be bypassed; regenerate `package-lock.json` with genuine npm metadata before release validation.

### 2026-10-17 — GitHub Git Data API complete-source publisher

The source backup now includes a second manual publication path that avoids `git clone` and `gh` CLI. From the extracted, manifest-verified package, run:

```bash
python3 scripts/publish-recovery-api.py --root . --branch agent/recover-complete-2026-10-17
# Review the dry-run summary. On an authenticated, networked workstation only:
GITHUB_TOKEN=<your-scoped-token> python3 scripts/publish-recovery-api.py \
  --root . --branch agent/recover-complete-2026-10-17 --publish
```

Do not commit tokens to a file or shell history; prefer a secure environment/secret store rather than literally typing a token into a shell command. The publisher verifies `recovery-manifest.json`, creates Git trees in batches, compares Git blob hashes, checks that `main` has not moved, creates a new `agent/*` ref, re-verifies the published branch, and opens a **draft** PR. It never overwrites an existing branch, writes to `main`, merges, or deploys. An HTTP error or missing draft PR is a failed publication, even if an unattached tree/commit or review branch was created. Run `python3 -m unittest discover -s tests -p test_publish_recovery_api.py -v` for offline publisher contract tests.

The canonical `main` remains design-only; publishing the full source to a review branch is still necessary. The npm lockfile remains incomplete for `better-sqlite3@12.10.1`; regenerate it using authentic npm registry metadata on a compatible networked Node.js host, then run `npm ci && npm run validate`. Do not merge until live authenticated two-tenant isolation checks are complete.

### October 18, 2026 — PDF ToUnicode multi-interval regression
Run `node --experimental-strip-types --test tests/pdf-to-unicode.test.mjs tests/parser.test.mjs` to validate disjoint fixed-width CMap intervals, codespace-gap rejection and verified PDF page evidence without external services. The full dependency-backed suite still requires an authentic regenerated `package-lock.json`, `npm ci`, and the configured production infrastructure. Do not use this bounded parser for arbitrary customer PDFs or confidential records.

### 2026-10-19 — ASCII85 PDF stream adapter and validation

Run `node --experimental-strip-types --test tests/pdf-ascii85.test.mjs tests/pdf-stream-filters.test.mjs tests/pdf-codespaces.test.mjs tests/pdf-to-unicode.test.mjs tests/parser.test.mjs` to validate page-content and font-map ASCII85 decoding without external credentials. The strict local adapter requires `~>` and rejects malformed/oversized streams and unsupported filter parameters. `maxBytes` limits the **encoded input and every decoded stage**, so some otherwise valid large streams intentionally require a production PDF parser. Do not treat parser rejection as evidence that a system/entity does not exist.

For canonical recovery, regenerate the source manifest and reproducible ZIP (`npm run recovery:manifest && npm run recovery:verify`; `python3 scripts/package-recovery.py --root . --manifest recovery-manifest.json --output sugar-platform-diagnostic-2026-10-19.zip`). On a networked machine, regenerate the npm lockfile from the registry (`npm install --package-lock-only --no-audit --no-fund`), then run `npm run baseline:check && npm ci && npm run validate`. Never invent integrity hashes, bypass live tenant checks, merge an incomplete recovery branch, or deploy from this demo-only validation.

### 2026-10-20 mixed-width ToUnicode validation

The local/demo PDF parser supports mixed one-/two-byte source codes only when their first-byte prefixes cannot be confused. Run `node --experimental-strip-types --test tests/pdf-codespaces.test.mjs tests/pdf-to-unicode.test.mjs tests/parser.test.mjs` to verify. This is not OCR, general PDF object-stream support or a production PDF certification. Release remains blocked until the complete source is on a reviewable GitHub branch and `npm ci`, typecheck, full tests, build and live tenant-isolation checks pass.

### 2026-10-21 — RunLength PDF local verification

Run `node --experimental-strip-types --test tests/pdf-runlength.test.mjs` for the new filter regressions, then `npm run lint` and `npm test` for the broader suite. The adapter requires no external service. Full dependency-backed validation still requires authentic `better-sqlite3@12.10.1` npm lockfile metadata and `npm ci` in a networked environment. Never deploy or process confidential production data on the basis of these local tests alone.

### 2026-10-22 — PDF LZW development and recovery

Run `node --experimental-strip-types --test tests/pdf-lzw.test.mjs` for the new default-EarlyChange LZW page/CMap decoder, then `npm run lint`, `npm test`, `npm run baseline:check`, `npm run typecheck`, and `npm run build`. The new decoder uses only Node built-ins and requires no external service. The full suite currently has pre-existing failures from missing npm dependencies; the baseline gate intentionally remains red until `package-lock.json` is regenerated with authentic `better-sqlite3@12.10.1` registry metadata. For recovery, verify `recovery-manifest.json`, package with `scripts/package-recovery.py`, and publish the **entire** verified tree to an agent branch/draft PR, never main. Do not use the local/demo PDF adapter for confidential production documents or claim full PDF/OCR support.

### 2026-10-23 — Bounded PNG predictor evidence checks

Run `node --experimental-strip-types --test tests/pdf-png-predictor.test.mjs tests/pdf-stream-filters.test.mjs tests/parser.test.mjs` for the dependency-free PNG Predictor 15 page/CMap regressions. Only single-filter Flate with direct Predictor 15, 8-bit single-channel rows is supported; unsupported DecodeParms and complex PDF/OCR features fail closed. This is not a production PDF engine. For a release gate, first synchronize the complete verified source package to GitHub, regenerate `package-lock.json` using authentic npm registry metadata, run `npm ci && npm run validate`, and certify live authenticated two-tenant isolation. Never deploy from a partial build.

### 2026-10-24 — TIFF Predictor 2 focused checks

Run `node --experimental-strip-types --test tests/pdf-tiff-predictor.test.mjs tests/pdf-png-predictor.test.mjs tests/pdf-stream-filters.test.mjs tests/parser.test.mjs` for local predictor and page/CMap evidence regression tests. Only direct Flate Predictor 2 with one 8-bit component is supported; other TIFF configurations fail closed. For release, restore full GitHub source parity, regenerate the npm lockfile from authentic registry metadata, then run `npm ci && npm run validate` and live authenticated two-tenant security checks. Do not deploy from the local/demo parser.

### 2026-10-25 — Dependency lock recovery
Run `npm run baseline:check` to verify canonical design files and pinned direct/transitive npm lock entries. `npm ci --offline --ignore-scripts --dry-run --no-audit --no-fund` checks lockfile consistency without downloading packages. Then, **on a networked build host**, run `npm ci --no-audit --no-fund && npm run validate`; actual tarball SRI verification and native SQLite installation require this step. The repaired lockfile records were sourced from a public npm v3 lockfile at `oliverjessner/sqlite-hub` commit `818a59e3b68fd377cda6f474b12dd1a44b64c6f2` (Decision 087). Never replace integrity values with placeholders or treat a dry run as build certification.

### Complete recovery PR — 2026-10-25
Review draft PR #56 (`agent/canonical-recovery-lockfile-2026-10-25`) rather than older partial recovery PRs. The branch's complete recursive tree was verified against the source manifest; do not merge until a networked GitHub Actions run passes `npm ci && npm run validate`, native SQLite compatibility is confirmed, and live non-`BYPASSRLS` two-tenant database/storage/scanner isolation is certified. `main` was not modified and production was not deployed.

### 2026-10-25 — Native Node test alias support
`npm test` uses `scripts/register-test-loader.mjs` and `scripts/node-test-alias-loader.mjs` to resolve only `@/lib/*` TypeScript aliases and extensionless relative imports originating inside `lib/` under Node 22's native ESM test runner. Next.js/TypeScript continue to use `tsconfig.json` path mapping in production. Run `node --experimental-strip-types --import ./scripts/register-test-loader.mjs --test tests/node-test-alias-loader.test.mjs` for isolated alias guard tests. See Decision 088. Do not use the test loader as a production authorization or filesystem access mechanism.

### 2026-10-25 — Deterministic audit receipt tests
`tests/assessment-lifecycle.test.mjs` includes an equal-timestamp audit regression with reverse UUID lexical order; SQLite must return request before failure using insertion order. Run it with `npm test` after real `npm ci`; the offline runner cannot load the native SQLite module. See Decision 089.
