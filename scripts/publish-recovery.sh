#!/usr/bin/env bash
# Manual fallback only: publish the reviewed local backup to a DRAFT PR.
# Never runs in the application or deploys. Requires authenticated git and gh.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="antonsakharov/sugarplatforms"
BRANCH="${1:-agent/recover-complete-2026-10-16}"
if [[ ! "$BRANCH" =~ ^agent/[a-zA-Z0-9._/-]+$ ]]; then
  echo "Refusing branch outside agent/*" >&2; exit 2
fi
for tool in git gh python3 node; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 2; }
done
node "$ROOT/scripts/recovery-snapshot.mjs" verify "$ROOT" "$ROOT/recovery-manifest.json"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# Preserve main history; do not force-push, merge, or modify main.
git clone --quiet --branch main --single-branch "https://github.com/${REPO}.git" "$WORK/repo"
git -C "$WORK/repo" switch -q -c "$BRANCH"
python3 - "$ROOT" "$WORK/repo" <<'PY'
from pathlib import Path
import hashlib, json, shutil, sys
source, target = map(Path, sys.argv[1:])
manifest = json.loads((source/'recovery-manifest.json').read_text())
for item in manifest['files']:
    rel = Path(item['path'])
    if rel.is_absolute() or '..' in rel.parts:
        raise SystemExit('Unsafe recovery path')
    original = source/rel
    if original.is_symlink() or not original.is_file():
        raise SystemExit('Non-regular recovery source')
    if hashlib.sha256(original.read_bytes()).hexdigest() != item['sha256']:
        raise SystemExit('Recovery source changed since manifest')
    dest = target/rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(original, dest)
shutil.copy2(source/'recovery-manifest.json', target/'recovery-manifest.json')
PY
# Warn on incomplete baseline; recovery still needs to be publishable as a
# DRAFT even when dependency lockfile repair is the reason for recovery.
if ! node "$ROOT/scripts/check-baseline.mjs" "$ROOT"; then
  echo "WARNING: recovery source is not release-certified; PR must remain draft." >&2
fi
git -C "$WORK/repo" add -A
git -C "$WORK/repo" diff --cached --check
git -C "$WORK/repo" diff --cached --stat
git -C "$WORK/repo" diff --cached --name-status
if git -C "$WORK/repo" diff --cached --quiet; then
  echo "No changes to publish."; exit 0
fi
# Require an explicit opt-in after showing the staged changes.
if [[ "${SUGAR_PUBLISH_CONFIRM:-}" != "YES" ]]; then
  echo "Dry run only. Review the staged files; set SUGAR_PUBLISH_CONFIRM=YES to push." >&2
  exit 3
fi
git -C "$WORK/repo" commit -m "Restore approved Sugar Diagnostic application and bounded PDF CMaps"
git -C "$WORK/repo" push --set-upstream origin "$BRANCH"
gh pr create --repo "$REPO" --base main --head "$BRANCH" --draft \
  --title "Draft: recover full Sugar Diagnostic application and bounded PDF CMaps" \
  --body "Review complete restored application, architecture-only limits, PDF evidence provenance, lockfile synchronization, and all CI/tenant-isolation gates before marking ready. Do not merge automatically."
