import { authenticatedContextSchema, AuthorizationDeniedError, type AuthenticatedContext, type Membership } from "./auth.ts";
import type { TenantContext } from "./tenancy.ts";
import { verifySupabaseAccessToken, type SupabaseAuthConfig } from "./supabase-auth.ts";
export class MembershipRequiredError extends AuthorizationDeniedError { constructor() { super("tenant:read"); this.name = "MembershipRequiredError"; } }
export type ProductionMembershipResolver = (input: { userId: string; tenant: TenantContext }) => Promise<Membership | null> | Membership | null;
export async function authenticateProductionSession(input: { accessToken: string; tenant: TenantContext; supabase: SupabaseAuthConfig; resolveMembership: ProductionMembershipResolver; fetchImpl?: typeof fetch }): Promise<AuthenticatedContext> { const user = await verifySupabaseAccessToken(input.accessToken, input.supabase, input.fetchImpl); const membership = await input.resolveMembership({ userId: user.id, tenant: input.tenant }); if (!membership) throw new MembershipRequiredError(); return authenticatedContextSchema.parse({ user, membership, tenant: input.tenant, authMethod: "supabase", productionReady: true }); }
