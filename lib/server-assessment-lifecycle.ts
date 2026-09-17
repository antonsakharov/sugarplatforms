import { PERSISTENCE_CONFIG } from "./config";
import { SqliteAssessmentLifecycleRepository } from "./assessment-lifecycle";

const globalStore = globalThis as typeof globalThis & { sugarAssessmentLifecycleRepository?: SqliteAssessmentLifecycleRepository };

export function getAssessmentLifecycleRepository() {
  if (!globalStore.sugarAssessmentLifecycleRepository) {
    globalStore.sugarAssessmentLifecycleRepository = new SqliteAssessmentLifecycleRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarAssessmentLifecycleRepository;
}
