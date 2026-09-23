import { PERSISTENCE_CONFIG } from "./config";
import { SqliteGeneratedReportMetadataStore } from "./generated-report-metadata";
import { GeneratedReportStorageService } from "./generated-report-storage";
import { getArtifactStorage } from "./server-artifact-storage";

const globalStore = globalThis as typeof globalThis & { sugarGeneratedReportStorage?: GeneratedReportStorageService };
export function getGeneratedReportStorage() {
  if (!globalStore.sugarGeneratedReportStorage) {
    globalStore.sugarGeneratedReportStorage = new GeneratedReportStorageService(
      getArtifactStorage(),
      new SqliteGeneratedReportMetadataStore(PERSISTENCE_CONFIG.assessmentDatabasePath)
    );
  }
  return globalStore.sugarGeneratedReportStorage;
}
