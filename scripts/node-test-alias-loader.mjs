/**
 * Test-only resolver for the TypeScript `@/lib/*` path alias. Next.js handles
 * this alias in the application build, but Node's native test runner does not.
 * Resolve only approved repository-local library modules; never intercept
 * arbitrary package imports or allow relative traversal.
 */
import { statSync } from "node:fs";
import { dirname, resolve as resolvePath, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ALIAS = /^@\/lib\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  if (!ALIAS.test(specifier)) throw new Error(`Unsupported test module alias: ${specifier}`);
  const relative = specifier.slice(2);
  for (const extension of [".ts", ".tsx", ".mjs", ".js"]) {
    const file = resolvePath(root, `${relative}${extension}`);
    if (!file.startsWith(join(root, "lib") + "/")) continue;
    try {
      if (statSync(file).isFile()) return nextResolve(pathToFileURL(file).href, context);
    } catch { /* Try the next supported extension. */ }
  }
  throw new Error(`Unresolved test module alias: ${specifier}`);
}
