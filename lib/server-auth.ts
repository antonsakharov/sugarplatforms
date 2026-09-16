import { AUTH_CONFIG, LOCAL_AUTH_CONFIG } from "./config";
import { authenticatedContextSchema, AuthenticationRequiredError, requirePermission, type AuthenticatedContext, type Permission } from "./auth";
import { authenticateProductionSession } from "./production-auth";
import { getAssessmentRepository, getServerTenantContext } from "./server-assessment-store";
import { scopeFromTenant } from "./tenancy";

function getLocalAuthContext(): AuthenticatedContext {
  if (!LOCAL_AUTH_CONFIG.enabled) throw new AuthenticationRequiredError();
  const tenant = getServerTenantContext();
  const scope = scopeFromTenant(tenant);
  const createdAt = new Date().toISOString();
  const user = { id: LOCAL_AUTH_CONFIG.userId, email: LOCAL_AUTH_CONFIG.email, displayName: LOCAL_AUTH_CONFIG.displayName, createdAt };
  const membership = getAssessmentRepository().ensureMembership(scope, user, {
    userId: user.id, organizationId: scope.organizationId, workspaceId: scope.workspaceId,
    role: LOCAL_AUTH_CONFIG.role, createdAt
  });
  return authenticatedContextSchema.parse({ user, membership, tenant, authMethod: "local-dev", productionReady: false });
}

export function extractAccessToken(request: Request): string {
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === AUTH_CONFIG.accessTokenCookieName) {
      const value = decodeURIComponent(rawValue.join("=")).trim();
      if (value) return value;
    }
  }
  throw new AuthenticationRequiredError();
}

export async function getServerAuthContext(request: Request): Promise<AuthenticatedContext> {
  if (AUTH_CONFIG.provider === "local") return getLocalAuthContext();
  const tenant = getServerTenantContext();
  const scope = scopeFromTenant(tenant);
  const accessToken = extractAccessToken(request);
  return authenticateProductionSession({
    accessToken,
    tenant,
    supabase: AUTH_CONFIG.supabase!,
    resolveMembership: ({ userId }) => getAssessmentRepository().getMembership(scope, userId)
  });
}

export async function requireServerPermission(request: Request, permission: Permission) {
  return requirePermission(await getServerAuthContext(request), permission);
}
