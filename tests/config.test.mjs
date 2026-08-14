import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("MVP limit defaults are present", () => {
  const source = fs.readFileSync(new URL("../lib/config.ts", import.meta.url), "utf8");
  assert.match(source, /MAX_UPLOAD_FILES/);
  assert.match(source, /max\(10\)/);
  assert.match(source, /MAX_TOTAL_PAGES/);
  assert.match(source, /max\(150\)/);
  assert.match(source, /MAX_PRIMARY_ENTITIES/);
  assert.match(source, /max\(1\)/);
});

test("health endpoint identifies the service", () => {
  const source = fs.readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(source, /sugar-platform-diagnostic/);
  assert.match(source, /status: \"ok\"/);
});
