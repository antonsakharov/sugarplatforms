# GitHub recovery and publication status — 2026-10-13

Canonical: `antonsakharov/sugarplatforms`, default branch `main`. Repository metadata and all requested baseline documents were checked through the connected GitHub integration. `main` contains README, system design, product scope and original backlog but lacks the application manifest/tree and required delivery, security, feature, protocol and decision-log files.

The latest approved 2026-10-12 ZIP was restored locally before feature work. Branch `agent/pdf-two-byte-cmap-2026-10-13` was created from `agent/pdf-inherited-font-resources-2026-10-12` (which itself does not include the complete October 12 working tree). A subsequent write of `project/DECISION_075.md` was blocked by integration safety checks. The branch is a **placeholder**, not a published implementation, and no PR was opened. No main-branch mutation or production deployment occurred.

The dated ZIP contains the complete updated application. `scripts/publish-recovery.sh` provides an explicit dry-run-first, authenticated `git`/`gh` fallback to stage the full sanitized package from canonical main on a dedicated `agent/*` branch, without merging or deploying. Full dependency-backed validation and human review are required before PR readiness.
