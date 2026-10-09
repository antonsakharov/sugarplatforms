import { PERSISTENCE_CONFIG } from "./config";
import { SqliteFindingReviewRepository } from "./finding-review-persistence";

const globalStore = globalThis as typeof globalThis & {
  sugarFindingReviewRepository?: SqliteFindingReviewRepository;
};

export function getFindingReviewRepository() {
  if (!globalStore.sugarFindingReviewRepository) {
    globalStore.sugarFindingReviewRepository = new SqliteFindingReviewRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  }
  return globalStore.sugarFindingReviewRepository;
}
