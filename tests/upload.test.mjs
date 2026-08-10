import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const policy = fs.readFileSync(new URL("../lib/upload.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/assessments/[id]/artifacts/route.ts", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../app/assessment/[id]/upload/upload-form.tsx", import.meta.url), "utf8");

test("upload metadata policy enforces count, size, and extension plus MIME allowlist", () => {
  assert.match(policy, /files\.length > PRODUCT_LIMITS\.maxFiles/);
  assert.match(policy, /file\.size > PRODUCT_LIMITS\.maxFileBytes/);
  assert.match(policy, /SUPPORTED_ARTIFACT_TYPES\.some/);
});

test("server performs transient content inspection and parsing without persisting uploaded bytes", () => {
  assert.match(route, /file\.arrayBuffer\(\)/);
  assert.match(route, /inspectArtifactBytes/);
  assert.match(route, /checksumSha256/);
  assert.match(route, /maxTotalPages/);
  assert.match(route, /storageMode: "transient-validation-and-parsing-only"/);
  assert.doesNotMatch(route, /writeFile|putObject|storage\.from|upload\(/);
});

test("duplicate content and page-limit violations block readiness", () => {
  assert.match(route, /checksums\.get\(inspection\.checksumSha256\)/);
  assert.match(route, /Duplicate artifact content must be removed or replaced/);
  assert.match(route, /measurablePages > PRODUCT_LIMITS\.maxTotalPages/);
});

test("guided UI supports remove and replace, displays risk results, and persists safe metadata only", () => {
  assert.match(form, /replaceFile/);
  assert.match(form, /removeFile/);
  assert.match(form, /Ready for analysis/);
  assert.match(form, /riskWarnings/);
  assert.match(form, /localStorage\.setItem/);
  assert.doesNotMatch(form, /arrayBuffer\(/);
});
