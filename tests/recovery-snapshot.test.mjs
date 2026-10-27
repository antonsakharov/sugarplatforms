import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inventory, verifyManifest, compareGitHubTree } from "../scripts/recovery-snapshot.mjs";

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "sugar-recovery-"));
  try {
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, "README.md"), "hello\n");
    writeFileSync(join(root, "docs", "SYSTEM_DESIGN.md"), "architecture metadata only\n");
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("stable sorted source hashes and Git blob IDs", () => fixture(root => {
  const first = inventory(root), second = inventory(root);
  assert.deepEqual(first, second);
  assert.equal(first.fileCount, 2);
  assert.deepEqual(first.files.map(f => f.path), ["README.md", "docs/SYSTEM_DESIGN.md"]);
  assert.match(first.files[0].gitBlobSha, /^[a-f0-9]{40}$/);
  assert.match(first.treeSha256, /^[a-f0-9]{64}$/);
}));

test("verify fails closed after source modification", () => fixture(root => {
  const manifest = inventory(root);
  verifyManifest(root, manifest);
  writeFileSync(join(root, "README.md"), "changed\n");
  assert.throws(() => verifyManifest(root, manifest), /does not match/);
}));

test("private .env and generated state are excluded", () => fixture(root => {
  writeFileSync(join(root, ".env"), "SECRET=hidden\n");
  writeFileSync(join(root, ".env.local"), "SECRET=hidden\n");
  writeFileSync(join(root, "tsconfig.tsbuildinfo"), "generated");
  writeFileSync(join(root, ".env.example"), "PUBLIC_EXAMPLE=\n");
  assert.deepEqual(inventory(root).files.map(f => f.path), [".env.example", "README.md", "docs/SYSTEM_DESIGN.md"]);
}));

test("unexpected files and symlinks are rejected", () => fixture(root => {
  writeFileSync(join(root, "unknown.bin"), "secret");
  assert.throws(() => inventory(root), /Unexpected source file/);
  rmSync(join(root, "unknown.bin"));
  symlinkSync(join(root, "README.md"), join(root, "shortcut.md"));
  assert.throws(() => inventory(root), /Symlink/);
}));

test("compare requires a complete non-truncated GitHub tree", () => fixture(root => {
  const snapshot = inventory(root);
  assert.throws(() => compareGitHubTree(snapshot, { truncated: true, tree: [] }), /truncated/);
  assert.throws(() => compareGitHubTree(snapshot, {}), /truncated/);
}));

test("compare detects missing, extra, mismatched and unsafe remote files", () => fixture(root => {
  const snapshot = inventory(root);
  const [a, b] = snapshot.files;
  const result = compareGitHubTree(snapshot, { truncated: false, tree: [
    { path: a.path, type: "blob", sha: "0".repeat(40), mode: "100644" },
    { path: b.path, type: "blob", sha: b.gitBlobSha, mode: "120000" },
    { path: "EXTRA.md", type: "blob", sha: "f".repeat(40), mode: "100644" },
  ] });
  assert.deepEqual(result.differentSha, [a.path]);
  assert.deepEqual(result.unsafeRemote, [b.path]);
  assert.deepEqual(result.unexpectedRemote, ["EXTRA.md"]);
  assert.equal(result.ok, false);
}));

test("compare passes only for byte-identical GitHub blob tree", () => fixture(root => {
  const snapshot = inventory(root);
  const result = compareGitHubTree(snapshot, { truncated: false, tree: snapshot.files.map(f => ({ path: f.path, sha: f.gitBlobSha, type: "blob", mode: "100644" })) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missingRemote, []);
}));

test("compare rejects duplicate GitHub paths", () => fixture(root => {
  const snapshot = inventory(root);
  assert.throws(() => compareGitHubTree(snapshot, { truncated: false, tree: [
    { path: "README.md", type: "blob", sha: "a" }, { path: "README.md", type: "blob", sha: "b" },
  ] }), /Malformed GitHub tree/);
}));
