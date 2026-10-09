# Validated 2026-09-14

## Increment

Fail-closed pre-persistence malware quarantine gate with a credential-free local/demo scanner and a production ClamAV INSTREAM integration boundary.

## Validated implementation head

`848895cd18b4b398072e26b9f1fc34920c8935fb`

GitHub Actions validate run: `34864935544`.

Environment:

- Ubuntu 24.04
- Node 22.23.2
- npm 10.9.8
- Next.js 15.4.10

Validation results:

- TypeScript: passed
- Source-policy lint: passed
- Tests: 164 passed, 0 failed
- Optimized production build: passed
- Repository snapshot packaging: passed
- Repository snapshot artifact upload: passed

The focused scanner tests cover clean local metadata, EICAR detection, executable-magic rejection, ClamAV clean/infected/error response parsing, scanner outage fail-closed behavior, and checksum-drift rejection. Upload-boundary tests verify malware scanning occurs before private storage and parser execution and that non-clean scans expose a non-released quarantine state.

## Security boundary

Artifact bytes remain request-memory quarantine data until every artifact receives an explicit clean scan. Infected sets return a blocked response and scanner outage/unrecognized output returns a fail-closed unavailable response. Neither path persists artifact bytes, parses content, extracts architecture objects, or updates processing/evidence state. The scanner revalidates the previously computed SHA-256 before provider execution.

The local scanner exists only to exercise the contract in credential-free demo environments and is not production antivirus coverage. Production configuration supports ClamAV INSTREAM with a server-only host/port/timeout boundary.

## MVP limits retained

- one focused active assessment per workspace;
- one primary entity;
- up to 10 files;
- up to 25 MB per file;
- up to 150 measurable pages total;
- architecture metadata only;
- no customer or regulated records;
- no credentials, secrets, or live production access.

## Remaining production limitations

- live ClamAV/scanner infrastructure, signature freshness, health monitoring, and worst-case throughput have not been validated;
- live Supabase private-bucket and PostgreSQL/RLS tenant-isolation tests remain credential-dependent;
- production identity/session verification remains open;
- production scheduler/worker activation and retention/backup verification remain open.

## Decision

ADR-049 records the fail-closed pre-persistence quarantine boundary.

No production deployment was performed.
