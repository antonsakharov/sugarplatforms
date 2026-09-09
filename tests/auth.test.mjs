import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, requirePermission, AuthorizationDeniedError } from "../lib/auth.ts";
import { SqliteAssessmentRepository, TenantScopeError } from "../lib/assessment-repository.ts";

function tenant(organizationId = "org-a", workspaceId = "workspace-a") {
  const createdAt = new Date().toISOString();
  return {
    organization: { id: organizationId, name: "Organization A", createdAt },
    workspace: { id: workspaceId, organizationId, name: "Workspace A", createdAt }
  };
}

function auth(role) {
  const createdAt = new Date().toISOString();
  const activeTenant = tenant();
  return {
    user: { id: "user-a", email: "user-a@example.com", displayName: "User A", createdAt },
    membership: { userId: "user-a", organizationId: "org-a", workspaceId: "workspace-a", role, createdAt },
    tenant: activeTenant, authMethod: "local-dev", productionReady: false
  };
}

test("viewer can read assessments but cannot create them", () => {
  const context = auth("viewer");
  assert.equal(hasPermission(context, "assessment:read"), true);
  assert.equal(hasPermission(context, "assessment:create"), false);
  assert.throws(() => requirePermission(context, "assessment:create"), AuthorizationDeniedError);
});

test("editor and admin can create assessments", () => {
  assert.equal(hasPermission(auth("editor"), "assessment:create"), true);
  assert.equal(hasPermission(auth("admin"), "assessment:create"), true);
});

test("membership is persisted only inside its registered organization/workspace", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  const activeTenant = repository.ensureTenant(tenant());
  const createdAt = new Date().toISOString();
  const user = { id: "user-a", email: "user-a@example.com", displayName: "User A", createdAt };
  const membership = { userId: user.id, organizationId: "org-a", workspaceId: "workspace-a", role: "editor", createdAt };
  repository.ensureMembership({ organizationId: "org-a", workspaceId: "workspace-a" }, user, membership);
  assert.equal(repository.getMembership({ organizationId: "org-a", workspaceId: "workspace-a" }, user.id)?.role, "editor");
  assert.equal(activeTenant.workspace.id, "workspace-a");
  assert.throws(() => repository.getMembership({ organizationId: "org-b", workspaceId: "workspace-a" }, user.id), TenantScopeError);
});

test("membership cannot be written with a mismatched tenant scope", () => {
  const repository = new SqliteAssessmentRepository(":memory:");
  repository.ensureTenant(tenant());
  const createdAt = new Date().toISOString();
  const user = { id: "user-a", email: "user-a@example.com", displayName: "User A", createdAt };
  assert.throws(() => repository.ensureMembership(
    { organizationId: "org-a", workspaceId: "workspace-a" }, user,
    { userId: user.id, organizationId: "org-a", workspaceId: "workspace-b", role: "admin", createdAt }
  ), TenantScopeError);
});
