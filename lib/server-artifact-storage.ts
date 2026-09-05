import { STORAGE_CONFIG } from "./config";
import { LocalPrivateArtifactStorage } from "./artifact-storage";

const globalStore = globalThis as typeof globalThis & { sugarArtifactStorage?: LocalPrivateArtifactStorage };

export function getArtifactStorage() {
  if (!globalStore.sugarArtifactStorage) {
    globalStore.sugarArtifactStorage = new LocalPrivateArtifactStorage(STORAGE_CONFIG.privateArtifactRoot);
  }
  return globalStore.sugarArtifactStorage;
}
