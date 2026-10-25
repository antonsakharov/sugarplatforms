import { PERSISTENCE_CONFIG } from "./config";
import { SqliteDeletionJobRepository } from "./deletion-jobs";

const globalStore = globalThis as typeof globalThis & { sugarDeletionJobRepository?: SqliteDeletionJobRepository };

export function getDeletionJobRepository() {
  if (!globalStore.sugarDeletionJobRepository) {
    globalStore.sugarDeletionJobRepository = new SqliteDeletionJobRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarDeletionJobRepository;
}
