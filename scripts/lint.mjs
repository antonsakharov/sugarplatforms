import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "tests", "scripts"];
const allowed = new Set([".ts", ".tsx", ".mjs"]);
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (allowed.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, "utf8");
      if (/\t/.test(text)) violations.push(`${full}: tabs are not allowed`);
      if (/console\.log\(/.test(text)) violations.push(`${full}: console.log is not allowed`);
    }
  }
}

for (const root of roots) if (fs.existsSync(root)) walk(root);
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.info("Source policy checks passed.");
