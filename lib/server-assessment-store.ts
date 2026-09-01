import { LOCAL_TENANT_CONFIG, PERSISTENCE_CONFIG } from "./config";
import { SqliteAssessmentRepository } from "./assessment-repository";
import { scopeFromTenant, type TenantContext } from "./tenancy";

const globalStore = globalThis as typeof globalThis & {
  sugarAssessmentRepository?: SqliteAssessmentRepository;
  sugarTenantContext?: TenantContext;
};

export function getAssessmentRepository() {
  if (!globalStore.sugarAssessmentRepository) {
    globalStore.sugarAssessmentRepository = new SqliteAssessmentRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarAssessmentRepository;
}

export function getServerTenantContext(): TenantContext {
  if (!globalStore.sugarTenantContext) {
    const createdAt = new Date().toISOString();
    globalStore.sugarTenantContext = getAssessmentRepository().ensureTenant({
      organization: { id: LOCAL_TENANT_CONFIG.organizationId, name: LOCAL_TENANT_CONFIG.organizationName, createdAt },
      workspace: {
        id: LOCAL_TENANT_CONFIG.workspaceId,
        organizationId: LOCAL_TENANT_CONFIG.organizationId,
        name: LOCAL_TENANT_CONFIG.workspaceName,
        createdAt
      }
    });
  }
  return globalStore.sugarTenantContext;
}

export function getServerTenantScope() {
  return scopeFromTenant(getServerTenantContext());
}
