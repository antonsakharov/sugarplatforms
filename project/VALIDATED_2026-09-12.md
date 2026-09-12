# Validation target — 2026-09-12

## Feature

Acme HealthTech sample fixtures and guided walkthrough.

## Required validation

- Node 22 TypeScript validation.
- Source-policy lint.
- Complete automated test suite, including the Acme fixture evidence/rule assertions.
- Optimized Next.js production build including `/api/sample/acme-healthtech` and `/sample`.
- JSON schema parse validation.
- Repository packaging and CI artifact upload.

## Security/product checks

- Four sample artifacts, one focused assessment, and one primary entity stay inside MVP limits.
- Fixtures contain architecture metadata only and no customer/regulated records, credentials, secrets, or live production access.
- Sample findings are produced by the existing deterministic engine from direct sample evidence; arbitrary findings are not seeded.
- The sample uses persisted extraction review, finding review, accepted findings, and report history rather than browser-only mock state.
- A conflicting active assessment is never automatically deleted or overwritten.
