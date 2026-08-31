import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAssessmentDraft } from "../lib/assessment.ts";
import { ActiveAssessmentLimitError, SqliteAssessmentRepository } from "../lib/assessment-repository.ts";

const validInput = {
  companyName: "Acme HealthTech",
  assessmentTitle: "Customer identity diagnostic",
  industry: "Healthcare technology",
  focusArea: "entity-identifier-fragmentation",
  primaryEntity: "Customer",
  knownSystems: "CRM, Billing",
  businessConcern: "Teams disagree on the canonical customer identifier.",
  reportAudience: "CTO",
  limitsAcknowledged: true
};

test("SQLite assessment repository survives repository re-instantiation", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sugar-assessment-"));
  const databasePath = path.join(directory, "assessment.sqlite");
  const created = createAssessmentDraft(validInput);
  new SqliteAssessmentRepository(databasePath).create("workspace-a", created);
  const reopened = new SqliteAssessmentRepository(databasePath);
  assert.deepEqual(reopened.findById("workspace-a", created.id), created);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("repository isolates assessment reads by workspace", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  const created = createAssessmentDraft(validInput);
  repository.create("workspace-a", created);
  assert.equal(repository.findById("workspace-b", created.id), null);
  assert.equal(repository.listActive("workspace-a").length, 1);
});

test("repository enforces one active assessment per workspace transactionally", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.create("workspace-a", createAssessmentDraft(validInput));
  assert.throws(
    () => repository.create("workspace-a", createAssessmentDraft({ ...validInput, assessmentTitle: "Second diagnostic" })),
    ActiveAssessmentLimitError
  );
  assert.equal(repository.listActive("workspace-a").length, 1);
});
