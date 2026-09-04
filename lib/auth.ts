import { z } from "zod";
import { tenantContextSchema } from "./tenancy.ts";

export const roleSchema = z.enum(["viewer", "editor", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const userIdentitySchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i),
  email: z.string().email(),
  displayName: z.string().trim().min(2).max(120),
  createdAt: z.string().datetime()
});

export const membershipSchema = z.object({
  userId: userIdentitySchema.shape.id,
  organizationId: tenantContextSchema.shape.organization.shape.id,
  workspaceId: tenantContextSchema.shape.workspace.shape.id,
  role: roleSchema,
  createdAt: z.string().datetime()
});

export const authenticatedContextSchema = z.object({
  user: userIdentitySchema,
  membership: membershipSchema,
  tenant: tenantContextSchema,
  authMethod: z.enum(["local-dev"]),
  productionReady: z.literal(false)
}).superRefine((value, context) => {
  if (value.membership.userId !== value.user.id) context.addIssue({ code: "custom", path: ["membership", "userId"], message: "Membership must belong to the authenticated user." });
  if (value.membership.organizationId !== value.tenant.organization.id || value.membership.workspaceId !== value.tenant.workspace.id) context.addIssue({ code: "custom", path: ["membership"], message: "Membership must match the active organization/workspace." });
});

export type UserIdentity = z.infer<typeof userIdentitySchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type AuthenticatedContext = z.infer<typeof authenticatedContextSchema>;
export type Permission = "assessment:read" | "assessment:create" | "tenant:read" | "artifact:create" | "artifact:read" | "artifact:delete";

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set(["assessment:read", "tenant:read", "artifact:read"]),
  editor: new Set(["assessment:read", "assessment:create", "tenant:read", "artifact:create", "artifact:read", "artifact:delete"]),
  admin: new Set(["assessment:read", "assessment:create", "tenant:read", "artifact:create", "artifact:read", "artifact:delete"])
};

export class AuthenticationRequiredError extends Error { constructor() { super("Authenticated access is required."); this.name = "AuthenticationRequiredError"; } }
export class AuthorizationDeniedError extends Error { constructor(permission: Permission) { super(`The current membership does not allow ${permission}.`); this.name = "AuthorizationDeniedError"; } }

export function hasPermission(context: AuthenticatedContext, permission: Permission) {
  const validated = authenticatedContextSchema.parse(context);
  return ROLE_PERMISSIONS[validated.membership.role].has(permission);
}
export function requirePermission(context: AuthenticatedContext, permission: Permission) {
  const validated = authenticatedContextSchema.parse(context);
  if (!hasPermission(validated, permission)) throw new AuthorizationDeniedError(permission);
  return validated;
}
