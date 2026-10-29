import { PERSISTENCE_CONFIG } from "./config.ts";
import { extractAccessToken } from "./server-auth.ts";
import { SupabaseDeletionOperations } from "./supabase-deletion-operations.ts";
export function getManagedDeletionOperationsForRequest(request: Request) {
  if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null;
  return new SupabaseDeletionOperations(PERSISTENCE_CONFIG.supabase, extractAccessToken(request));
}
