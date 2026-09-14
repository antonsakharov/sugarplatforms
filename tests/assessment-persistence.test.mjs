import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAssessmentDraft } from "../lib/assessment.ts";
import { ActiveAssessmentLimitError, SqliteAssessmentRepository } from "../lib/assessment-repository.ts";

const scopeA = { organizationId: "org-a", workspaceId: "workspace-a" };
const tenantA = { organization: { id: "org-a", name: "Org A", createdAt: new Date().toISOString() }, workspace: { id: "workspace-a", organizationId: "org-a", name: "Workspace A", createdAt: new Date().toISOString() } };

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
  const first = new SqliteAssessmentRepository(databasePath);
  first.ensureTenant(tenantA);
  first.create(scopeA, created);
  const reopened = new SqliteAssessmentRepository(databasePath);
  assert.deepEqual(reopened.findById(scopeA, created.id), created);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("repository isolates assessment reads by workspace", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  const created = createAssessmentDraft(validInput);
  repository.ensureTenant(tenantA);
  repository.create(scopeA, created);
  repository.ensureTenant({ organization: { id: "org-a", name: "Org A", createdAt: new Date().toISOString() }, workspace: { id: "workspace-b", organizationId: "org-a", name: "Workspace B", createdAt: new Date().toISOString() } });
  assert.equal(repository.findById({ organizationId: "org-a", workspaceId: "workspace-b" }, created.id), null);
  assert.equal(repository.listActive(scopeA).length, 1);
});

test("repository enforces one active assessment per workspace transactionally", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.ensureTenant(tenantA);
  repository.create(scopeA, createAssessmentDraft(validInput));
  assert.throws(
    () => repository.create(scopeA, createAssessmentDraft({ ...validInput, assessmentTitle: "Second diagnostic" })),
    ActiveAssessmentLimitError
  );
  assert.equal(repository.listActive(scopeA).length, 1);
});
