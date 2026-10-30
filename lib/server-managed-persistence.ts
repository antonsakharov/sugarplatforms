import { PERSISTENCE_CONFIG } from "./config.ts";
import { SupabasePostgresStore } from "./supabase-postgres.ts";
const globalStore = globalThis as typeof globalThis & { sugarSupabasePostgresStore?: SupabasePostgresStore };
export function getManagedPostgresStore() { if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null; if (!globalStore.sugarSupabasePostgresStore) globalStore.sugarSupabasePostgresStore = new SupabasePostgresStore(PERSISTENCE_CONFIG.supabase); return globalStore.sugarSupabasePostgresStore; }
