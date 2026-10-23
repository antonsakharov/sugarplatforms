import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function checkBaseline(root = process.cwd()) {
  const files = ["README.md", "docs/SYSTEM_DESIGN.md", "docs/PRODUCT_SCOPE.md",
    "docs/DELIVERY_PLAN.md", "docs/SECURITY_AND_PRIVACY.md", "docs/FEATURES.md",
    "project/BACKLOG.md", "project/DAILY_BUILD_PROTOCOL.md",
    "project/DECISIONS.md", "package.json", "package-lock.json"];
  const errors = files.filter(p => !existsSync(join(root, p))).map(p => p + ": missing");
  if (errors.length) return { ok: false, errors };
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const base = lock.packages?.[""] ?? {};
  for (const kind of ["dependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(pkg[kind] ?? {})) {
      if (base[kind]?.[name] !== version || !lock.packages?.["node_modules/" + name])
        errors.push(kind + "." + name + ": lockfile mismatch");
    }
  }
  if (JSON.stringify(pkg.engines ?? {}) !== JSON.stringify(base.engines ?? {}))
    errors.push("Node engine: lockfile mismatch");
  return { ok: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith("/check-baseline.mjs")) {
  const result = checkBaseline();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 1;
}
