/**
 * Dependency-free, source-only recovery inventory for a canonical GitHub PR.
 * Never uploads or executes source files. Git blob IDs allow an exact comparison
 * with GitHub's recursive tree API without trusting timestamps or filenames.
 * Usage:
 *   node scripts/recovery-snapshot.mjs write [root] [manifest.json]
 *   node scripts/recovery-snapshot.mjs verify [root] [manifest.json]
 *   node scripts/recovery-snapshot.mjs compare [root] [github-tree.json]
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const IGNORED_DIRS = new Set([".git", "node_modules", ".next", ".cache", ".data", "coverage", "__pycache__"]);
const IGNORED_FILES = new Set([".DS_Store", "tsconfig.tsbuildinfo", "recovery-manifest.json"]);
const ALLOWED_EXTENSIONS = new Set([".md", ".txt", ".ts", ".tsx", ".mjs", ".js", ".json", ".sql", ".css", ".yml", ".yaml", ".sh", ".py", ".svg", ".mmd"]);
const ALLOWED_BASENAMES = new Set(["Dockerfile", ".env.example", ".gitignore"]);
const MAX_FILES = 3000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

function hex(algorithm, bytes) { return createHash(algorithm).update(bytes).digest("hex"); }
function gitBlob(bytes) { return hex("sha1", Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])); }
function allowedFile(name) {
  if (IGNORED_FILES.has(name)) return false;
  if (name.startsWith(".env") && name !== ".env.example") return false;
  if (/\.(?:pem|key|p12|pfx|db|sqlite|sqlite3|log|zip|tgz|tar|gz)$/i.test(name)) return false;
  if (/^(?:id_rsa|id_ed25519|credentials|secrets)(?:\.|$)/i.test(name)) return false;
  return ALLOWED_BASENAMES.has(name) || ALLOWED_EXTENSIONS.has(name.slice(name.lastIndexOf(".")));
}

/** Source-only snapshot; rejects unexpected or symlinked files rather than silently publishing them. */
export function inventory(root) {
  const directory = resolve(root);
  const files = [];
  let totalBytes = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const full = join(dir, entry.name);
      const rel = relative(directory, full).split(/[/\\]/).join("/");
      const stat = lstatSync(full);
      if (stat.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      if (stat.isSymbolicLink()) throw new Error(`Symlink is not a publishable source file: ${rel}`);
      if (stat.isDirectory()) { walk(full); continue; }
      if (!stat.isFile()) throw new Error(`Non-regular source path: ${rel}`);
      if (IGNORED_FILES.has(entry.name) || (entry.name.startsWith(".env") && entry.name !== ".env.example") || /\.(?:pem|key|p12|pfx|db|sqlite|sqlite3|log|zip|tgz|tar|gz)$/i.test(entry.name)) continue;
      if (!allowedFile(entry.name)) throw new Error(`Unexpected source file type (review before publishing): ${rel}`);
      if (stat.size > MAX_FILE_BYTES) throw new Error(`Oversized source file: ${rel}`);
      if (files.length >= MAX_FILES || totalBytes + stat.size > MAX_TOTAL_BYTES) throw new Error("Source snapshot budget exceeded");
      const bytes = readFileSync(full);
      if (bytes.length !== stat.size || lstatSync(full).mtimeMs !== stat.mtimeMs) throw new Error(`Source changed during inventory: ${rel}`);
      totalBytes += bytes.length;
      files.push({ path: rel, bytes: bytes.length, sha256: hex("sha256", bytes), gitBlobSha: gitBlob(bytes) });
    }
  }
  walk(directory);
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const digest = hex("sha256", Buffer.from(files.map(f => `${f.path}\0${f.sha256}\n`).join("")));
  return { schemaVersion: 1, algorithm: "sha256+git-blob-sha1", fileCount: files.length, totalBytes, treeSha256: digest, files };
}

/** Refuses a stale/tampered manifest and never trusts a manifest's claimed count. */
export function verifyManifest(root, manifest) {
  const actual = inventory(root);
  if (JSON.stringify(actual) !== JSON.stringify(manifest)) throw new Error("Recovery manifest does not match source tree");
  return actual;
}

/** Compare with a full GitHub GET /git/trees/{ref}?recursive=1 JSON response. */
export function compareGitHubTree(local, githubTree) {
  if (!githubTree || githubTree.truncated !== false || !Array.isArray(githubTree.tree)) throw new Error("GitHub tree is absent or truncated");
  const remote = new Map();
  for (const entry of githubTree.tree) {
    if (entry.type !== "blob") continue;
    if (typeof entry.path !== "string" || typeof entry.sha !== "string" || remote.has(entry.path)) throw new Error("Malformed GitHub tree entry");
    remote.set(entry.path, entry);
  }
  const expected = new Map(local.files.map(f => [f.path, f]));
  const missingRemote = [], unexpectedRemote = [], differentSha = [], unsafeRemote = [];
  for (const file of local.files) {
    const match = remote.get(file.path);
    if (!match) missingRemote.push(file.path);
    else if (match.mode !== "100644" && match.mode !== "100755") unsafeRemote.push(file.path);
    else if (match.sha !== file.gitBlobSha) differentSha.push(file.path);
  }
  for (const path of remote.keys()) if (!expected.has(path)) unexpectedRemote.push(path);
  return { ok: ![missingRemote, unexpectedRemote, differentSha, unsafeRemote].some(x => x.length), localFiles: local.fileCount, remoteFiles: remote.size, missingRemote, unexpectedRemote, differentSha, unsafeRemote };
}

const self = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
  try {
    const [action, root = process.cwd(), file = "recovery-manifest.json"] = process.argv.slice(2);
    if (!["write", "verify", "compare"].includes(action)) throw new Error("Usage: recovery-snapshot.mjs <write|verify|compare> [root] [file]");
    const source = resolve(root);
    const output = resolve(file);
    if (action === "write") {
      if (output !== join(source, "recovery-manifest.json")) throw new Error("Manifest output must be <root>/recovery-manifest.json");
      const snapshot = inventory(source);
      writeFileSync(output, JSON.stringify(snapshot, null, 2) + "\n", { flag: "w", mode: 0o600 });
      process.stdout.write(`Recovery manifest: ${snapshot.fileCount} files, SHA-256 ${snapshot.treeSha256}\n`);
    } else if (action === "verify") {
      const snapshot = verifyManifest(source, JSON.parse(readFileSync(output, "utf8")));
      process.stdout.write(`PASS: recovery manifest matches ${snapshot.fileCount} source files\n`);
    } else {
      const snapshot = inventory(source);
      const result = compareGitHubTree(snapshot, JSON.parse(readFileSync(output, "utf8")));
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      if (!result.ok) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`BLOCKED: ${error.message}\n`);
    process.exitCode = 1;
  }
}
