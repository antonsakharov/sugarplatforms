import type { AuthenticatedContext } from "./auth.ts";
import { PERSISTENCE_CONFIG } from "./config.ts";
import type { ExecutiveReport } from "./reporting.ts";
import { extractAccessToken } from "./server-auth.ts";
import { getReportRepository } from "./server-report-store.ts";
import { SupabaseReportHistoryStore } from "./supabase-report-history.ts";
import { scopeFromTenant } from "./tenancy.ts";
const globalStore = globalThis as typeof globalThis & { sugarSupabaseReportHistoryStore?: SupabaseReportHistoryStore };
function managedStore() { if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null; if (!globalStore.sugarSupabaseReportHistoryStore) globalStore.sugarSupabaseReportHistoryStore = new SupabaseReportHistoryStore(PERSISTENCE_CONFIG.supabase); return globalStore.sugarSupabaseReportHistoryStore; }
export async function listReportsForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = managedStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.list(extractAccessToken(request), scope, assessmentId); } return getReportRepository().list(scope, assessmentId); }
export async function findReportForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string, reportId: string) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = managedStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.findById(extractAccessToken(request), scope, assessmentId, reportId); } return getReportRepository().findById(scope, assessmentId, reportId); }
export async function saveReportForRequest(request: Request, auth: AuthenticatedContext, report: ExecutiveReport) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = managedStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.save(extractAccessToken(request), scope, report); } return getReportRepository().save(scope, report); }
