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

test("form persists only a validated server response in the local demo adapter", () => {
  assert.match(form, /fetch\("\/api\/assessments"/);
  assert.match(form, /localStorage\.setItem/);
  assert.match(form, /limitsAcknowledged/);
});
