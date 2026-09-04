import { LOCAL_AUTH_CONFIG } from "./config";
import { authenticatedContextSchema, AuthenticationRequiredError, requirePermission, type Permission } from "./auth";
import { getAssessmentRepository, getServerTenantContext } from "./server-assessment-store";
import { scopeFromTenant } from "./tenancy";

export function getServerAuthContext() {
  if (!LOCAL_AUTH_CONFIG.enabled) throw new AuthenticationRequiredError();
  const tenant = getServerTenantContext();
  const scope = scopeFromTenant(tenant);
  const createdAt = new Date().toISOString();
  const user = {
    id: LOCAL_AUTH_CONFIG.userId,
    email: LOCAL_AUTH_CONFIG.email,
    displayName: LOCAL_AUTH_CONFIG.displayName,
    createdAt
  };
  const membership = getAssessmentRepository().ensureMembership(scope, user, {
    userId: user.id,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    role: LOCAL_AUTH_CONFIG.role,
    createdAt
  });
  return authenticatedContextSchema.parse({ user, membership, tenant, authMethod: "local-dev", productionReady: false });
}

export function requireServerPermission(permission: Permission) {
  return requirePermission(getServerAuthContext(), permission);
}
