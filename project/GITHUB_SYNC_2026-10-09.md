# Canonical GitHub reconciliation — 2026-10-09

Canonical repository: `antonsakharov/sugarplatforms`; default branch: `main`.

`main` currently contains the design/backlog only and lacks the application manifest and several required baseline documents. The 2026-10-08 approved full application ZIP was restored locally and extended on 2026-10-09 with the verified page-tree parser.

A recovery branch `agent/recover-baseline-pdf-page-tree-2026-10-09` was created from `main`. The tree of the latest previously published application branch (`agent/pdf-text-encoding-2026-10-08`) was restored into a new commit on this branch. The page-tree module, integration, parser regressions, decision record and status documentation were committed there. This is real GitHub publication, but the published parser is an older bounded adapter and does not yet include all the newer parsing and operational code preserved in the local ZIP.

**Do not merge the recovery branch.** First compare all 304 local working-package files against the recovery branch, publish all missing/changed files, synchronize `package-lock.json` and dependency installation, pass full build/type/lint/tests and live isolation checks, then request review. Draft PR creation was attempted twice and blocked by the connector's safety layer; no PR was created.
