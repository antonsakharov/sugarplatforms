#!/usr/bin/env python3
"""Publish a verified complete recovery snapshot as one GitHub draft PR.

Uses the GitHub Git Data REST API rather than 300+ Contents API commits or a
local git clone. Default is a read-only dry run. Never writes to main, merges,
deploys, logs tokens, or reads files outside the verified source manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPOSITORY = "antonsakharov/sugarplatforms"
API_ROOT = "https://api.github.com"
BRANCH_PATTERN = re.compile(r"^agent/[A-Za-z0-9][A-Za-z0-9._/-]{0,90}$")
MAX_RESPONSE_BYTES = 12 * 1024 * 1024


class PublicationError(Exception):
    """Expected, redacted publication/preflight failure."""


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def load_verified_source(root: Path) -> tuple[dict, list[dict]]:
    root = root.resolve(strict=True)
    manifest_path = root / "recovery-manifest.json"
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise PublicationError("Missing regular recovery-manifest.json")
    check = subprocess.run(
        ["node", str(root / "scripts/recovery-snapshot.mjs"), "verify", str(root), str(manifest_path)],
        capture_output=True, text=True, check=False,
    )
    if check.returncode:
        raise PublicationError("Source manifest verification failed: " + check.stderr.strip()[:300])
    manifest = json.loads(manifest_path.read_text("utf-8"))
    files = []
    for item in manifest["files"]:
        name = item["path"]
        path = PurePosixPath(name)
        if (not name or name.startswith("/") or "\\" in name or ".." in path.parts
                or str(path) != name or path.parts[0] == ".git"):
            raise PublicationError("Unsafe source path in manifest")
        source = root.joinpath(*path.parts)
        if source.is_symlink() or not source.is_file():
            raise PublicationError(f"Missing regular source: {name}")
        data = source.read_bytes()
        if (len(data) != item["bytes"] or hashlib.sha256(data).hexdigest() != item["sha256"]
                or git_blob_sha(data) != item["gitBlobSha"]):
            raise PublicationError(f"Source changed during publication: {name}")
        try:
            content = data.decode("utf-8", "strict")
        except UnicodeDecodeError as error:
            raise PublicationError(f"Non-UTF-8 source cannot be published inline: {name}") from error
        files.append({"path": name, "mode": "100644", "type": "blob", "content": content})
    if len(files) != manifest["fileCount"] or not files:
        raise PublicationError("Manifest file count mismatch")
    # The manifest is published alongside source files, but is not self-listed.
    manifest_bytes = manifest_path.read_bytes()
    manifest["_manifestBlobSha"] = git_blob_sha(manifest_bytes)
    files.append({"path": "recovery-manifest.json", "mode": "100644", "type": "blob",
                  "content": manifest_bytes.decode("utf-8", "strict")})
    return manifest, files


class GitHubClient:
    def __init__(self, token: str):
        if not token:
            raise PublicationError("GITHUB_TOKEN or GH_TOKEN is required for --publish")
        self.token = token

    def call(self, method: str, path: str, body: dict | None = None) -> dict:
        if not path.startswith("/repos/" + REPOSITORY + "/"):
            raise PublicationError("Refusing GitHub API path outside canonical repository")
        payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = Request(API_ROOT + path, data=payload, method=method,
                      headers={"Authorization": "Bearer " + self.token,
                               "Accept": "application/vnd.github+json",
                               "X-GitHub-Api-Version": "2022-11-28",
                               "User-Agent": "Sugar-Diagnostic-Recovery/1.0",
                               **({"Content-Type": "application/json"} if payload is not None else {})})
        try:
            with urlopen(req, timeout=40) as response:
                content = response.read(MAX_RESPONSE_BYTES + 1)
                if len(content) > MAX_RESPONSE_BYTES:
                    raise PublicationError("GitHub response exceeded safety limit")
                return json.loads(content)
        except HTTPError as error:
            # Do not include arbitrary response bodies: they can contain secrets.
            raise PublicationError(f"GitHub API returned HTTP {error.code} for {method} {path}") from None
        except (URLError, TimeoutError, OSError) as error:
            raise PublicationError(f"GitHub API transport failed for {method} {path}: {type(error).__name__}") from None


def check_tree(manifest: dict, tree: dict) -> None:
    if tree.get("truncated") is not False or not isinstance(tree.get("tree"), list):
        raise PublicationError("GitHub tree missing or truncated")
    remote = {}
    for entry in tree["tree"]:
        if entry.get("type") == "blob":
            name = entry.get("path")
            if not isinstance(name, str) or name in remote:
                raise PublicationError("Malformed/duplicate remote tree path")
            remote[name] = entry
        elif entry.get("type") not in ("tree",):
            raise PublicationError("Unsupported GitHub tree object type")
    expected = {item["path"]: item["gitBlobSha"] for item in manifest["files"]}
    expected["recovery-manifest.json"] = manifest["_manifestBlobSha"]
    if set(remote) != set(expected):
        missing = sorted(set(expected) - set(remote))
        extra = sorted(set(remote) - set(expected))
        raise PublicationError(f"Remote tree parity failed: {len(missing)} missing, {len(extra)} unexpected")
    for name, sha in expected.items():
        if remote[name].get("sha") != sha or remote[name].get("mode") != "100644":
            raise PublicationError(f"Remote blob/mode mismatch: {name}")


def publish(client: GitHubClient, manifest: dict, files: list[dict], branch: str,
            chunk_size: int = 40) -> dict:
    if not BRANCH_PATTERN.fullmatch(branch) or ".." in branch or "//" in branch or branch.endswith(("/", ".", ".lock")):
        raise PublicationError("Only a safe agent/* branch is allowed")
    if not 1 <= chunk_size <= 100:
        raise PublicationError("Chunk size must be between 1 and 100")
    prefix = "/repos/" + REPOSITORY
    base = client.call("GET", prefix + "/git/ref/heads/main")
    main_sha = base["object"]["sha"]
    commit = client.call("GET", prefix + "/git/commits/" + main_sha)
    tree_sha = commit["tree"]["sha"]
    # No branch/ref write until the entire candidate tree passes byte parity.
    for start in range(0, len(files), chunk_size):
        result = client.call("POST", prefix + "/git/trees", {
            "base_tree": tree_sha, "tree": files[start:start + chunk_size]})
        tree_sha = result["sha"]
    final_tree = client.call("GET", prefix + "/git/trees/" + tree_sha + "?recursive=1")
    check_tree(manifest, final_tree)
    latest = client.call("GET", prefix + "/git/ref/heads/main")
    if latest["object"]["sha"] != main_sha:
        raise PublicationError("main changed during preparation; retry from the new head")
    result = client.call("POST", prefix + "/git/commits", {
        "message": "Restore complete approved Sugar Diagnostic source snapshot",
        "tree": tree_sha, "parents": [main_sha]})
    new_commit = result["sha"]
    client.call("POST", prefix + "/git/refs", {
        "ref": "refs/heads/" + branch, "sha": new_commit})
    # Verify published ref, not just an unattached candidate tree.
    ref = client.call("GET", prefix + "/git/ref/heads/" + branch)
    if ref["object"]["sha"] != new_commit:
        raise PublicationError("Branch ref differs from newly published commit")
    published_commit = client.call("GET", prefix + "/git/commits/" + new_commit)
    published = client.call("GET", prefix + "/git/trees/" + published_commit["tree"]["sha"] + "?recursive=1")
    check_tree(manifest, published)
    pr = client.call("POST", prefix + "/pulls", {
        "title": "Draft: restore complete Sugar Platform Diagnostic source",
        "head": branch, "base": "main", "draft": True,
        "body": ("Complete manifest-verified recovery snapshot. Do not merge until "
                 "real npm ci, build/type/lint/tests, and live "
                 "two-tenant security checks pass. No deployment or automatic merge.")})
    if pr.get("draft") is not True:
        raise PublicationError("GitHub did not confirm draft PR state")
    return {"branch": branch, "commit": new_commit, "files": manifest["fileCount"],
            "treeSha256": manifest["treeSha256"], "draftPr": pr["html_url"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--branch", default="agent/recover-complete-2026-10-17")
    parser.add_argument("--chunk-size", type=int, default=40)
    parser.add_argument("--publish", action="store_true", help="Explicitly enable GitHub writes and draft PR")
    args = parser.parse_args()
    try:
        if not BRANCH_PATTERN.fullmatch(args.branch) or ".." in args.branch or "//" in args.branch:
            raise PublicationError("Unsafe branch name; only agent/* allowed")
        manifest, files = load_verified_source(args.root)
        print(f"PASS: verified {manifest['fileCount']} source files plus manifest, tree SHA-256 {manifest['treeSha256']}")
        if not args.publish:
            print("DRY RUN: no GitHub writes. Use --publish with GITHUB_TOKEN/ GH_TOKEN to publish a draft PR.")
            return 0
        client = GitHubClient(os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN") or "")
        result = publish(client, manifest, files, args.branch, args.chunk_size)
        print(json.dumps(result, indent=2))
        return 0
    except (PublicationError, KeyError, ValueError, json.JSONDecodeError) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
