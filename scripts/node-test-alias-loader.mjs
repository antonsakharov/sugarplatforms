/**
 * Test-only resolver for the TypeScript `@/lib/*` path alias. Next.js handles
 * this alias in the application build, but Node's native test runner does not.
 * Resolve only approved repository-local library modules; never intercept
 * arbitrary package imports or allow relative traversal.
 */
import { statSync } from "node:fs";
import { dirname, resolve as resolvePath, join, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ALIAS = /^@\/lib\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;
const libraryRoot = join(root, "lib") + "/";

async function resolveLibraryFile(base, context, nextResolve) {
  if (!base.startsWith(libraryRoot)) throw new Error("Test import escaped the library boundary");
  for (const extension of [".ts", ".tsx", ".mjs", ".js"]) {
    const file = `${base}${extension}`;
    try {
      if (statSync(file).isFile()) return nextResolve(pathToFileURL(file).href, context);
    } catch { /* Try the next supported extension. */ }
  }
  throw new Error(`Unresolved test module: ${base.slice(root.length + 1)}`);
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    if (!ALIAS.test(specifier)) throw new Error(`Unsupported test module alias: ${specifier}`);
    return resolveLibraryFile(resolvePath(root, specifier.slice(2)), context, nextResolve);
  }
  // Some older source modules use extensionless relative imports. Node ESM
  // does not infer `.ts`; Next.js does. Resolve them only inside lib/.
  if (/^\.{1,2}\//.test(specifier) && !extname(specifier) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(libraryRoot)) {
      return resolveLibraryFile(resolvePath(dirname(parent), specifier), context, nextResolve);
    }
  }
  return nextResolve(specifier, context);
}
