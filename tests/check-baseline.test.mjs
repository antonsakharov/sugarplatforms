import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkBaseline, REQUIRED_BASELINE_FILES } from "../scripts/check-baseline.mjs";

function withRepository(run) {
  const root = mkdtempSync(join(tmpdir(), "sugar-baseline-"));
  const manifest = {
    name: "sugar-platform-diagnostic", version: "0.1.0", engines: { node: ">=22" },
    scripts: { build: "next build", typecheck: "tsc --noEmit", lint: "node scripts/lint.mjs", test: "node --test" },
    dependencies: { zod: "4.0.17" }, devDependencies: { typescript: "5.9.2" },
  };
  const lock = { name: manifest.name, version: manifest.version, lockfileVersion: 3, packages: {
    "": { name: manifest.name, version: manifest.version, engines: manifest.engines,
      dependencies: { ...manifest.dependencies }, devDependencies: { ...manifest.devDependencies } },
    "node_modules/zod": { version: "4.0.17", resolved: "https://registry.npmjs.org/zod/-/zod-4.0.17.tgz", integrity: `sha512-${Buffer.alloc(64).toString("base64")}` },
    "node_modules/typescript": { version: "5.9.2", resolved: "https://registry.npmjs.org/typescript/-/typescript-5.9.2.tgz", integrity: `sha512-${Buffer.alloc(64).toString("base64")}` },
  }};
  try {
    for (const path of REQUIRED_BASELINE_FILES) {
      const full = join(root, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, "approved baseline\n");
    }
    const save = () => {
      writeFileSync(join(root, "package.json"), JSON.stringify(manifest));
      writeFileSync(join(root, "package-lock.json"), JSON.stringify(lock));
    };
    save();
    run({ root, manifest, lock, save });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a complete baseline with exact lockfile parity", () => withRepository(({ root }) => {
  assert.deepEqual(checkBaseline(root), { ok: true, errors: [], checkedFiles: REQUIRED_BASELINE_FILES.length });
}));

test("fails closed when a required baseline document is missing", () => withRepository(({ root }) => {
  rmSync(join(root, "docs/SECURITY_AND_PRIVACY.md"));
  assert.ok(checkBaseline(root).errors.some((error) => error.includes("docs/SECURITY_AND_PRIVACY.md: missing")));
}));

test("detects stale root dependencies and missing native package entries", () => withRepository(({ root, manifest, save }) => {
  manifest.dependencies["better-sqlite3"] = "12.10.1";
  save();
  const errors = checkBaseline(root).errors;
  assert.ok(errors.some((error) => error.includes("dependencies.better-sqlite3 differs")));
}));

test("detects missing package entries even if root lock claims parity", () => withRepository(({ root, lock, save }) => {
  delete lock.packages["node_modules/zod"];
  save();
  assert.ok(checkBaseline(root).errors.some((error) => error.includes("missing installed package entry for zod")));
}));

test("rejects lockfile engine drift and wrong pinned package versions", () => withRepository(({ root, lock, save }) => {
  lock.packages[""].engines = { node: ">=20" };
  lock.packages["node_modules/typescript"].version = "5.8.0";
  save();
  const errors = checkBaseline(root).errors;
  assert.ok(errors.some((error) => error.includes("root engines differ")));
  assert.ok(errors.some((error) => error.includes("installed typescript version differs")));
}));

test("rejects malformed lockfile without throwing or mutating files", () => withRepository(({ root }) => {
  writeFileSync(join(root, "package-lock.json"), "{not json");
  assert.ok(checkBaseline(root).errors.some((error) => error.includes("invalid JSON")));
}));


test("rejects a symlinked required document instead of trusting outside content", () => withRepository(({ root }) => {
  const path = join(root, "docs/FEATURES.md");
  rmSync(path);
  symlinkSync(join(root, "README.md"), path);
  assert.ok(checkBaseline(root).errors.some((error) => error.includes("docs/FEATURES.md: not a regular file")));
}));


test("rejects missing integrity and non-registry tarball URLs", () => withRepository(({ root, lock, save }) => {
  lock.packages["node_modules/zod"].integrity = "sha512-unverified";
  lock.packages["node_modules/typescript"].resolved = "https://evil.invalid/typescript.tgz";
  save();
  const errors = checkBaseline(root).errors;
  assert.ok(errors.some((error) => error.includes("invalid SHA-512 integrity for node_modules/zod")));
  assert.ok(errors.some((error) => error.includes("untrusted or missing registry URL for node_modules/typescript")));
}));

test("rejects a missing required transitive dependency", () => withRepository(({ root, lock, save }) => {
  lock.packages["node_modules/zod"].dependencies = { "not-installed": "^1.0.0" };
  save();
  assert.ok(checkBaseline(root).errors.some((error) => error.includes("missing required transitive package not-installed")));
}));

test("accepts a nested transitive package with valid registry integrity", () => withRepository(({ root, lock, save }) => {
  lock.packages["node_modules/zod"].dependencies = { "nested-dep": "1.0.0" };
  lock.packages["node_modules/zod/node_modules/nested-dep"] = {
    version: "1.0.0", resolved: "https://registry.npmjs.org/nested-dep/-/nested-dep-1.0.0.tgz",
    integrity: `sha512-${Buffer.alloc(64).toString("base64")}`,
  };
  save();
  assert.equal(checkBaseline(root).ok, true);
}));
