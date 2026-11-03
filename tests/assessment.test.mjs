import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schema = fs.readFileSync(new URL("../lib/assessment.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/assessments/route.ts", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../app/assessment/new/assessment-form.tsx", import.meta.url), "utf8");

test("assessment is limited to one selected focus and acknowledged boundaries", () => {
  assert.match(schema, /focusArea: z\.enum\(FOCUS_AREAS\)/);
  assert.match(schema, /primaryEntity: z\.string/);
  assert.match(schema, /limitsAcknowledged: z\.literal\(true\)/);
});

test("server route validates assessment payload before creation", () => {
  assert.match(route, /assessmentInputSchema\.safeParse/);
  assert.match(route, /maxPrimaryEntities !== 1/);
  assert.match(route, /status: 201/);
});

test("form caches only a validated, server-persisted response for compatibility", () => {
  assert.match(form, /fetch\(withBasePath\("\/api\/assessments"\)/);
  assert.match(route, /createAssessmentForRequest\(request, auth, assessment\)/);
  assert.match(form, /localStorage\.setItem/);
  assert.match(form, /limitsAcknowledged/);
});


test("assessment form visibly states every MVP scope limit before acknowledgement", () => {
  for (const expected of [
    "One focused assessment in this workspace",
    "One primary business entity",
    "Up to 10 supported architecture files",
    "Up to 25 MB per file",
    "Up to 150 pages total where measurable",
    "Architecture metadata only"
  ]) assert.match(form, new RegExp(expected));
  assert.match(form, /no prohibited records, credentials, secrets, or live production data/);
});
