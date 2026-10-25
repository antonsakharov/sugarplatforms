import type { AuthenticatedContext } from "./auth.ts";
import { PERSISTENCE_CONFIG } from "./config.ts";
import type { ProcessingSnapshot } from "./processing-repository.ts";
import { extractAccessToken } from "./server-auth.ts";
import { getManagedPostgresStore } from "./server-managed-persistence.ts";
import { getProcessingRepository } from "./server-processing-store.ts";
import { scopeFromTenant } from "./tenancy.ts";

export async function replaceProcessingForRequest(request: Request, auth: AuthenticatedContext, snapshot: ProcessingSnapshot) {
  const scope = scopeFromTenant(auth.tenant);
  if (PERSISTENCE_CONFIG.provider === "supabase-postgres") {
    const store = getManagedPostgresStore();
    if (!store) throw new Error("Managed PostgreSQL persistence is not configured.");
    return store.replaceProcessing(extractAccessToken(request), scope, snapshot);
  }
  return getProcessingRepository().replace(scope, snapshot);
}

export async function findProcessingForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string) {
  const scope = scopeFromTenant(auth.tenant);
  if (PERSISTENCE_CONFIG.provider === "supabase-postgres") {
    const store = getManagedPostgresStore();
    if (!store) throw new Error("Managed PostgreSQL persistence is not configured.");
    return store.findProcessing(extractAccessToken(request), scope, assessmentId);
  }
  return getProcessingRepository().find(scope, assessmentId);
}
