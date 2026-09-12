import { PERSISTENCE_CONFIG } from "./config";
import { SqliteProcessingRepository } from "./processing-repository";

const globalStore = globalThis as typeof globalThis & {
  sugarProcessingRepository?: SqliteProcessingRepository;
};

export function getProcessingRepository() {
  if (!globalStore.sugarProcessingRepository) {
    globalStore.sugarProcessingRepository = new SqliteProcessingRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarProcessingRepository;
}
