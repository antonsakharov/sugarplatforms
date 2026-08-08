import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const policy = fs.readFileSync(new URL("../lib/upload.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/assessments/[id]/artifacts/route.ts", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../app/assessment/[id]/upload/upload-form.tsx", import.meta.url), "utf8");

test("upload policy enforces count, size, and an allowlisted extension plus MIME pair", () => {
  assert.match(policy, /files\.length > PRODUCT_LIMITS\.maxFiles/);
  assert.match(policy, /file\.size > PRODUCT_LIMITS\.maxFileBytes/);
  assert.match(policy, /SUPPORTED_ARTIFACT_TYPES\.some/);
  assert.match(policy, /type\.extensions\.includes/);
  assert.match(policy, /type\.mimeTypes\.includes/);
});

test("server validates multipart files and does not persist uploaded content in demo mode", () => {
  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /validateArtifactSet\(files\)/);
  assert.match(route, /storageMode: "validation-only"/);
  assert.doesNotMatch(route, /arrayBuffer\(/);
});

test("guided UI constrains selection, shows security guidance, and calls server validation", () => {
  assert.match(form, /multiple/);
  assert.match(form, /accept=\{ACCEPT_ATTRIBUTE\}/);
  assert.match(form, /MAX_FILES = 10/);
  assert.match(form, /25 \* 1024 \* 1024/);
  assert.match(form, /Do not upload customer or patient records/);
  assert.match(form, /fetch\(`\/api\/assessments\/\$\{assessmentId\}\/artifacts`/);
});
