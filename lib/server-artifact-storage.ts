import { STORAGE_CONFIG } from "./config";
import { LocalPrivateArtifactStorage, type ArtifactStorage } from "./artifact-storage";
import { SupabasePrivateArtifactStorage } from "./supabase-artifact-storage";

const globalStore = globalThis as typeof globalThis & { sugarArtifactStorage?: ArtifactStorage };

export function getArtifactStorage(): ArtifactStorage {
  if (!globalStore.sugarArtifactStorage) {
    globalStore.sugarArtifactStorage = STORAGE_CONFIG.provider === "supabase"
      ? new SupabasePrivateArtifactStorage(STORAGE_CONFIG.supabase!)
      : new LocalPrivateArtifactStorage(STORAGE_CONFIG.privateArtifactRoot);
  }
  return globalStore.sugarArtifactStorage;
}
