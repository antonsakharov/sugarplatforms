/**
 * Fail-closed, dependency-free repository preflight for the canonical recovery PR.
 * Checks presence of the approved design baseline and exact direct-dependency
 * lockfile parity. It never downloads packages, rewrites a lockfile, or handles
 * customer artifacts. Run before `npm ci` and before reviewing a recovery PR.
 */
import { readFileSync, lstatSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_BASELINE_FILES = Object.freeze([
  "README.md",
  "docs/SYSTEM_DESIGN.md",
  "docs/PRODUCT_SCOPE.md",
  "docs/DELIVERY_PLAN.md",
  "docs/SECURITY_AND_PRIVACY.md",
  "docs/FEATURES.md",
  "project/BACKLOG.md",
  "project/DAILY_BUILD_PROTOCOL.md",
  "project/DECISIONS.md",
  "package.json",
  "package-lock.json",
]);

function readJson(root, relativePath, errors) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: cannot read valid JSON (${error instanceof SyntaxError ? "invalid JSON" : "unreadable"})`);
    return null;
  }
}

function directDependencies(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/** @returns {{ok:boolean, errors:string[], checkedFiles:number}} */
export function checkBaseline(root) {
  const errors = [];
  const directory = resolve(root);
  for (const path of REQUIRED_BASELINE_FILES) {
    try {
      if (!lstatSync(join(directory, path)).isFile()) errors.push(`${path}: not a regular file`);
    } catch {
      errors.push(`${path}: missing`);
    }
  }
  if (errors.some((error) => error.endsWith(": missing") || error.endsWith(": not a regular file"))) {
    return { ok: false, errors, checkedFiles: REQUIRED_BASELINE_FILES.length };
  }

  const manifest = readJson(directory, "package.json", errors);
  const lock = readJson(directory, "package-lock.json", errors);
  if (!manifest || !lock) return { ok: false, errors, checkedFiles: REQUIRED_BASELINE_FILES.length };

  if (lock.lockfileVersion !== 3 || !lock.packages || typeof lock.packages !== "object") {
    errors.push("package-lock.json: expected npm lockfile v3 with packages map");
    return { ok: false, errors, checkedFiles: REQUIRED_BASELINE_FILES.length };
  }
  const rootLock = lock.packages[""];
  if (!rootLock || typeof rootLock !== "object") {
    errors.push('package-lock.json: missing root packages[""]');
    return { ok: false, errors, checkedFiles: REQUIRED_BASELINE_FILES.length };
  }
  for (const field of ["name", "version"]) {
    if (manifest[field] !== rootLock[field]) errors.push(`package-lock.json: root ${field} differs from package.json`);
  }
  if (JSON.stringify(manifest.engines ?? {}) !== JSON.stringify(rootLock.engines ?? {})) {
    errors.push("package-lock.json: root engines differ from package.json");
  }

  for (const field of ["dependencies", "devDependencies"]) {
    const expected = directDependencies(manifest[field]);
    const locked = directDependencies(rootLock[field]);
    for (const name of new Set([...Object.keys(expected), ...Object.keys(locked)])) {
      if (expected[name] !== locked[name]) {
        errors.push(`package-lock.json: ${field}.${name} differs from package.json`);
        continue;
      }
      // Direct pinned packages must exist as actual lock entries, not only
      // names in the root dependency table. Never synthesize integrity hashes.
      const entry = lock.packages[`node_modules/${name}`];
      if (!entry || typeof entry !== "object") {
        errors.push(`package-lock.json: missing installed package entry for ${name}`);
      } else if (/^\d+\.\d+\.\d+$/.test(expected[name]) && entry.version !== expected[name]) {
        errors.push(`package-lock.json: installed ${name} version differs from pinned ${expected[name]}`);
      }
    }
  }
  // Every published package must be pinned to an authenticated npm tarball.
  // A syntactically valid root dependency table is not sufficient: npm ci
  // otherwise fails later or can resolve unreviewed transitive packages.
  for (const [packagePath, entry] of Object.entries(lock.packages)) {
    if (!packagePath) continue;
    if (!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(packagePath)) {
      errors.push(`package-lock.json: invalid installed package path ${packagePath}`);
      continue;
    }
    if (!entry || typeof entry !== "object" || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(entry.version ?? "")) {
      errors.push(`package-lock.json: invalid pinned version for ${packagePath}`);
      continue;
    }
    const packageName = packagePath.split("/node_modules/").at(-1).replace(/^node_modules\//, "");
    const encodedName = packageName.startsWith("@") ? `${packageName.split("/")[0]}/${packageName.split("/")[1]}` : packageName;
    const expectedUrl = `https://registry.npmjs.org/${encodedName}/-/${packageName.split("/").at(-1)}-${entry.version}.tgz`;
    if (entry.resolved !== expectedUrl) errors.push(`package-lock.json: untrusted or missing registry URL for ${packagePath}`);
    const integrity = entry.integrity;
    if (typeof integrity !== "string" || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity) || Buffer.from(integrity.slice(7), "base64").length !== 64) {
      errors.push(`package-lock.json: invalid SHA-512 integrity for ${packagePath}`);
    }
    for (const dep of Object.keys(directDependencies(entry.dependencies))) {
      // Node's resolution ascends from the package directory to the root.
      let parent = packagePath;
      let found = false;
      while (parent) {
        if (lock.packages[`${parent}/node_modules/${dep}`]) { found = true; break; }
        const last = parent.lastIndexOf("/node_modules/");
        parent = last >= 0 ? parent.slice(0, last) : "";
      }
      if (!found && lock.packages[`node_modules/${dep}`]) found = true;
      if (!found) errors.push(`package-lock.json: missing required transitive package ${dep} for ${packagePath}`);
    }
  }

  for (const script of ["build", "typecheck", "lint", "test"]) {
    if (typeof manifest.scripts?.[script] !== "string" || !manifest.scripts[script].trim()) {
      errors.push(`package.json: missing ${script} validation script`);
    }
  }
  return { ok: errors.length === 0, errors, checkedFiles: REQUIRED_BASELINE_FILES.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const json = process.argv.includes("--json");
  const root = process.argv.find((arg, index) => index > 1 && arg !== "--json") ?? process.cwd();
  const result = checkBaseline(root);
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write(`${result.ok ? "PASS" : "BLOCKED"}: Sugar Diagnostic repository baseline (${result.checkedFiles} required files)\n`);
    for (const error of result.errors) process.stdout.write(` - ${error}\n`);
  }
  if (!result.ok) process.exitCode = 1;
}
