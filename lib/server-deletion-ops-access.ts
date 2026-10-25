import { PERSISTENCE_CONFIG } from "./config";
import { extractAccessToken } from "./server-auth";
import { getAssessmentLifecycleRepository } from "./server-assessment-lifecycle";
import { getDeletionJobRepository } from "./server-deletion-jobs";
import { SupabaseDeletionOpsStore } from "./supabase-deletion-ops";
import type { TenantScope } from "./tenancy";

let managedStore: SupabaseDeletionOpsStore | undefined;
function getManagedStore() {
  if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null;
  if (!managedStore) managedStore = new SupabaseDeletionOpsStore(PERSISTENCE_CONFIG.supabase);
  return managedStore;
}
export async function listAuditForRequest(request: Request, scope: TenantScope, assessmentId: string) {
  const managed = getManagedStore();
  if (managed) return managed.listAudit(extractAccessToken(request), scope, assessmentId);
  return getAssessmentLifecycleRepository().listAudit(scope, assessmentId);
}
export async function listDeletionJobsForRequest(request: Request, scope: TenantScope, limit = 50) {
  const managed = getManagedStore();
  if (managed) return managed.listJobs(extractAccessToken(request), scope, limit);
  return getDeletionJobRepository().list(scope, limit);
}
