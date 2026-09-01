import { z } from "zod";

const tenantIdSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i);

export const organizationSchema = z.object({
  id: tenantIdSchema,
  name: z.string().trim().min(2).max(120),
  createdAt: z.string().datetime()
});

export const workspaceSchema = z.object({
  id: tenantIdSchema,
  organizationId: tenantIdSchema,
  name: z.string().trim().min(2).max(120),
  createdAt: z.string().datetime()
});

export const tenantContextSchema = z.object({
  organization: organizationSchema,
  workspace: workspaceSchema
}).superRefine((value, context) => {
  if (value.workspace.organizationId !== value.organization.id) {
    context.addIssue({ code: "custom", path: ["workspace", "organizationId"], message: "Workspace must belong to the selected organization." });
  }
});

export type Organization = z.infer<typeof organizationSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type TenantContext = z.infer<typeof tenantContextSchema>;
export type TenantScope = { organizationId: string; workspaceId: string };

export function scopeFromTenant(tenant: TenantContext): TenantScope {
  return { organizationId: tenant.organization.id, workspaceId: tenant.workspace.id };
}
