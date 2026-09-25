import { PERSISTENCE_CONFIG } from "./config";
import { SqliteReportRepository } from "./report-persistence";

const globalStore = globalThis as typeof globalThis & { sugarReportRepository?: SqliteReportRepository };

export function getReportRepository() {
  if (!globalStore.sugarReportRepository) globalStore.sugarReportRepository = new SqliteReportRepository(PERSISTENCE_CONFIG.assessmentDatabasePath);
  return globalStore.sugarReportRepository;
}
