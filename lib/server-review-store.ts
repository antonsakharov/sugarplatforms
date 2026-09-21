import { PERSISTENCE_CONFIG } from "./config";
import { SqliteExtractionReviewRepository } from "./review-persistence";

const globalStore = globalThis as typeof globalThis & {
  sugarExtractionReviewRepository?: SqliteExtractionReviewRepository;
};

export function getExtractionReviewRepository() {
  if (!globalStore.sugarExtractionReviewRepository) {
    globalStore.sugarExtractionReviewRepository = new SqliteExtractionReviewRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarExtractionReviewRepository;
}
