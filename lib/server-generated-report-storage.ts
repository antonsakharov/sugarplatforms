import { PERSISTENCE_CONFIG } from "./config";
import { SqliteGeneratedReportMetadataStore } from "./generated-report-metadata";
import { GeneratedReportStorageService } from "./generated-report-storage";
import { getArtifactStorage } from "./server-artifact-storage";
import { SupabaseGeneratedReportMetadataStore } from "./supabase-generated-report-metadata";

const globalStore = globalThis as typeof globalThis & { sugarGeneratedReportStorage?: GeneratedReportStorageService };
export function getGeneratedReportStorage() {
  if (!globalStore.sugarGeneratedReportStorage) {
    const metadata = PERSISTENCE_CONFIG.provider === "supabase-postgres"
      ? (PERSISTENCE_CONFIG.supabase ? new SupabaseGeneratedReportMetadataStore(PERSISTENCE_CONFIG.supabase) : (() => { throw new Error("Managed PostgreSQL persistence is not configured."); })())
      : new SqliteGeneratedReportMetadataStore(PERSISTENCE_CONFIG.assessmentDatabasePath);
    globalStore.sugarGeneratedReportStorage = new GeneratedReportStorageService(getArtifactStorage(), metadata);
  }
  return globalStore.sugarGeneratedReportStorage;
}
