import test from "node:test";
import assert from "node:assert/strict";
import { createAssessmentDraft } from "../lib/assessment.ts";
import { SqliteAssessmentRepository, TenantScopeError } from "../lib/assessment-repository.ts";

const input = {
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

function tenant(organizationId, workspaceId, organizationName = "Org", workspaceName = "Workspace") {
  const createdAt = new Date().toISOString();
  return {
    organization: { id: organizationId, name: organizationName, createdAt },
    workspace: { id: workspaceId, organizationId, name: workspaceName, createdAt }
  };
}

test("tenant identity is persisted and can be resolved by organization/workspace scope", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  const created = repository.ensureTenant(tenant("org-a", "workspace-a"));
  assert.equal(repository.getTenant({ organizationId: "org-a", workspaceId: "workspace-a" })?.workspace.id, created.workspace.id);
  assert.equal(repository.getTenant({ organizationId: "org-b", workspaceId: "workspace-a" }), null);
});

test("assessment access fails closed when organization does not own the workspace", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.ensureTenant(tenant("org-a", "workspace-a"));
  const assessment = createAssessmentDraft(input);
  repository.create({ organizationId: "org-a", workspaceId: "workspace-a" }, assessment);
  assert.throws(() => repository.findById({ organizationId: "org-b", workspaceId: "workspace-a" }, assessment.id), TenantScopeError);
});

test("same assessment id is not visible through another registered workspace", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.ensureTenant(tenant("org-a", "workspace-a"));
  repository.ensureTenant(tenant("org-a", "workspace-b"));
  const assessment = createAssessmentDraft(input);
  repository.create({ organizationId: "org-a", workspaceId: "workspace-a" }, assessment);
  assert.equal(repository.findById({ organizationId: "org-a", workspaceId: "workspace-b" }, assessment.id), null);
});

test("workspace ids cannot be rebound to a different organization", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.ensureTenant(tenant("org-a", "workspace-a"));
  assert.throws(() => repository.ensureTenant(tenant("org-b", "workspace-a")), TenantScopeError);
});
