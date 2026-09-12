# Validation Notes — 2026-08-31

## Durable assessment persistence slice

- New assessments are persisted server-side before the create API reports success.
- SQLite persistence is workspace-scoped and uses a transaction to enforce the MVP limit of one active assessment per workspace.
- Reopening the database must preserve validated assessment metadata.
- Cross-workspace lookup must return no record.
- Browser localStorage remains a compatibility cache and fallback only.
- Uploaded artifact bytes, parsed source content, extraction, findings, and reports remain outside this persistence slice.
- Local source-policy checks passed.
- All 13 JSON schema documents parsed successfully.
- Full TypeScript, behavioral tests, upload-validation regression suite, and optimized Next.js build are delegated to the authoritative GitHub Actions Node 22 gate for the published branch.
