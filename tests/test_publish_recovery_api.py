"""Offline contract tests for atomic GitHub recovery publication."""
import importlib.util
import json
from pathlib import Path
import unittest

script = Path(__file__).resolve().parents[1] / "scripts" / "publish-recovery-api.py"
spec = importlib.util.spec_from_file_location("sugar_recovery_publisher", script)
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class FakeGitHub:
    def __init__(self, *, drift=False, corrupt=False, extra=False, not_draft=False):
        self.drift, self.corrupt, self.extra, self.not_draft = drift, corrupt, extra, not_draft
        self.calls = []
        self.trees = {"initial-tree": {}}
        self.main_reads = 0
        self.branch = None
        self.created_commit = None

    def call(self, method, path, body=None):
        self.calls.append((method, path, body))
        if path.endswith("/git/ref/heads/main"):
            self.main_reads += 1
            return {"object": {"sha": "new-main" if self.drift and self.main_reads > 1 else "initial-main"}}
        if path.endswith("/git/commits/initial-main"):
            return {"tree": {"sha": "initial-tree"}}
        if method == "POST" and path.endswith("/git/trees"):
            prior = self.trees[body["base_tree"]].copy()
            for entry in body["tree"]:
                sha = publisher.git_blob_sha(entry["content"].encode("utf-8"))
                prior[entry["path"]] = {"path": entry["path"], "type": "blob", "mode": entry["mode"], "sha": sha}
            sha = "tree-" + str(len(self.trees))
            self.trees[sha] = prior
            return {"sha": sha}
        if "/git/trees/" in path and method == "GET":
            sha = path.split("/git/trees/")[1].split("?")[0]
            rows = list(self.trees[sha].values())
            if self.corrupt and rows:
                rows[0] = {**rows[0], "sha": "wrong"}
            if self.extra:
                rows.append({"path": "unexpected", "type": "blob", "mode": "100644", "sha": "extra"})
            return {"truncated": False, "tree": rows}
        if method == "POST" and path.endswith("/git/commits"):
            assert body["parents"] == ["initial-main"]
            self.created_commit = {"tree": {"sha": body["tree"]}}
            return {"sha": "new-commit"}
        if path.endswith("/git/commits/new-commit"):
            return self.created_commit
        if method == "POST" and path.endswith("/git/refs"):
            assert body["ref"].startswith("refs/heads/agent/")
            self.branch = body["ref"].removeprefix("refs/heads/")
            return {"ref": body["ref"]}
        if path.endswith("/git/ref/heads/" + str(self.branch)):
            return {"object": {"sha": "new-commit"}}
        if method == "POST" and path.endswith("/pulls"):
            assert body["draft"] is True and body["base"] == "main"
            return {"draft": not self.not_draft, "html_url": "https://github.com/antonsakharov/sugarplatforms/pull/999"}
        raise AssertionError(f"Unexpected API request: {method} {path}")


def fixture():
    source = [
        {"path": "README.md", "mode": "100644", "type": "blob", "content": "# Sample\n"},
        {"path": "src/app.ts", "mode": "100644", "type": "blob", "content": "export const n = 1;\n"},
        {"path": "recovery-manifest.json", "mode": "100644", "type": "blob", "content": "{}\n"},
    ]
    manifest = {"fileCount": 2, "treeSha256": "fake-tree-commitment",
                "_manifestBlobSha": publisher.git_blob_sha(source[-1]["content"].encode()),
                "files": [{"path": entry["path"], "gitBlobSha": publisher.git_blob_sha(entry["content"].encode())}
                          for entry in source[:-1]]}
    return manifest, source


class PublicationTests(unittest.TestCase):
    def test_atomic_full_tree_and_draft_pr(self):
        manifest, files = fixture()
        api = FakeGitHub()
        result = publisher.publish(api, manifest, files, "agent/verified-snapshot", chunk_size=1)
        self.assertEqual(result["files"], 2)
        self.assertEqual(result["branch"], "agent/verified-snapshot")
        self.assertEqual(result["draftPr"], "https://github.com/antonsakharov/sugarplatforms/pull/999")
        self.assertEqual(len([c for c in api.calls if c[1].endswith("/git/trees")]), 3)
        self.assertEqual(len([c for c in api.calls if c[1].endswith("/git/refs")]), 1)
        self.assertEqual(api.calls[-1][1].split("/")[-1], "pulls")

    def test_corrupt_tree_never_creates_commit_or_ref(self):
        manifest, files = fixture()
        api = FakeGitHub(corrupt=True)
        with self.assertRaisesRegex(publisher.PublicationError, "blob/mode mismatch"):
            publisher.publish(api, manifest, files, "agent/verified")
        self.assertFalse(any("/git/commits" in p and m == "POST" for m, p, _ in api.calls))
        self.assertFalse(any(p.endswith("/git/refs") for _, p, _ in api.calls))

    def test_extra_tree_file_never_publishes(self):
        manifest, files = fixture()
        api = FakeGitHub(extra=True)
        with self.assertRaisesRegex(publisher.PublicationError, "parity failed"):
            publisher.publish(api, manifest, files, "agent/verified")
        self.assertIsNone(api.branch)

    def test_main_changes_before_commit(self):
        manifest, files = fixture()
        api = FakeGitHub(drift=True)
        with self.assertRaisesRegex(publisher.PublicationError, "main changed"):
            publisher.publish(api, manifest, files, "agent/verified")
        self.assertIsNone(api.branch)

    def test_no_non_agent_branch(self):
        manifest, files = fixture()
        for name in ("main", "refs/heads/main", "agent/../main", "agent//bad", "agent/a.lock", "agent/"):
            with self.subTest(name=name), self.assertRaises(publisher.PublicationError):
                publisher.publish(FakeGitHub(), manifest, files, name)

    def test_chunk_bounds(self):
        manifest, files = fixture()
        for size in (0, 101, -1):
            with self.assertRaisesRegex(publisher.PublicationError, "Chunk size"):
                publisher.publish(FakeGitHub(), manifest, files, "agent/valid", chunk_size=size)

    def test_draft_pr_must_be_confirmed(self):
        manifest, files = fixture()
        with self.assertRaisesRegex(publisher.PublicationError, "draft PR"):
            publisher.publish(FakeGitHub(not_draft=True), manifest, files, "agent/verified")

    def test_truncated_tree_rejected(self):
        manifest, files = fixture()
        with self.assertRaisesRegex(publisher.PublicationError, "truncated"):
            publisher.check_tree(manifest, {"truncated": True, "tree": []})

    def test_duplicate_remote_path_rejected(self):
        manifest, files = fixture()
        entry = {"path": "README.md", "type": "blob", "mode": "100644", "sha": "x"}
        with self.assertRaisesRegex(publisher.PublicationError, "duplicate"):
            publisher.check_tree(manifest, {"truncated": False, "tree": [entry, entry]})

    def test_local_manifest_contains_publishable_source_and_manifest(self):
        root = script.parents[1]
        manifest, files = publisher.load_verified_source(root)
        self.assertEqual(len(files), manifest["fileCount"] + 1)
        self.assertEqual(files[-1]["path"], "recovery-manifest.json")
        self.assertEqual(files[-1]["mode"], "100644")


if __name__ == "__main__":
    unittest.main()
