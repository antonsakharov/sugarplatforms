import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const project = resolve(import.meta.dirname, "..");
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "sugar-package-"));
  try {
    mkdirSync(join(root, "scripts"));
    writeFileSync(join(root, "scripts", "recovery-snapshot.mjs"), readFileSync(join(project, "scripts", "recovery-snapshot.mjs")));
    writeFileSync(join(root, "README.md"), "test source\n");
    writeFileSync(join(root, ".env"), "PRIVATE_KEY=secret\n");
    const manifest = join(root, "recovery-manifest.json");
    const make = spawnSync("node", [join(root, "scripts", "recovery-snapshot.mjs"), "write", root, manifest], { encoding: "utf8" });
    assert.equal(make.status, 0, make.stderr);
    run({ root, manifest, output: join(root, "snapshot.zip") });
  } finally { rmSync(root, { recursive: true, force: true }); }
}
function pack({ root, manifest, output }) {
  return spawnSync("python3", [join(project, "scripts", "package-recovery.py"), "--root", root, "--manifest", manifest, "--output", output], { encoding: "utf8" });
}

test("recovery package is reproducible and excludes private files", () => fixture(args => {
  const first = pack(args);
  assert.equal(first.status, 0, first.stderr);
  const bytes = readFileSync(args.output);
  assert.equal(pack(args).status, 0);
  assert.deepEqual(readFileSync(args.output), bytes);
  const check = spawnSync("python3", ["-c", "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(' '.join(z.namelist()))", args.output], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  assert.doesNotMatch(check.stdout, /\.env(?:\s|$)/);
  assert.match(check.stdout, /recovery-manifest\.json/);
}));

test("recovery package refuses a stale manifest", () => fixture(args => {
  writeFileSync(join(args.root, "README.md"), "changed\n");
  const result = pack(args);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BLOCKED/);
}));
