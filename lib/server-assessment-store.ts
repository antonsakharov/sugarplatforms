import { PERSISTENCE_CONFIG } from "./config";
import { SqliteAssessmentRepository } from "./assessment-repository";

const globalStore = globalThis as typeof globalThis & {
  sugarAssessmentRepository?: SqliteAssessmentRepository;
};

export function getAssessmentRepository() {
  if (!globalStore.sugarAssessmentRepository) {
    globalStore.sugarAssessmentRepository = new SqliteAssessmentRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarAssessmentRepository;
}
