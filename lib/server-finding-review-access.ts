import type { AuthenticatedContext } from "./auth.ts";
import { PERSISTENCE_CONFIG } from "./config.ts";
import type { DiagnosticEnvelope } from "./diagnostics.ts";
import type { ExtractionReview } from "./extraction-review.ts";
import type { FindingReview } from "./finding-review.ts";
import { extractAccessToken } from "./server-auth.ts";
import { getFindingReviewRepository } from "./server-finding-review-store.ts";
import { SupabaseFindingReviewStore } from "./supabase-finding-review.ts";
import { scopeFromTenant } from "./tenancy.ts";
const globalStore = globalThis as typeof globalThis & { sugarSupabaseFindingReviewStore?: SupabaseFindingReviewStore };
function managedStore() { if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null; if (!globalStore.sugarSupabaseFindingReviewStore) globalStore.sugarSupabaseFindingReviewStore = new SupabaseFindingReviewStore(PERSISTENCE_CONFIG.supabase); return globalStore.sugarSupabaseFindingReviewStore; }
export async function findFindingReviewForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string, currentDiagnostics?: DiagnosticEnvelope) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = managedStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.find(extractAccessToken(request), scope, assessmentId, currentDiagnostics); } return getFindingReviewRepository().find(scope, assessmentId, currentDiagnostics); }
export async function saveFindingReviewForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string, diagnostics: DiagnosticEnvelope, review: FindingReview, expectedFingerprint: string, expectedExtractionReview: ExtractionReview) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = managedStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.save(extractAccessToken(request), scope, assessmentId, diagnostics, review, expectedFingerprint, expectedExtractionReview); } return getFindingReviewRepository().save(scope, assessmentId, diagnostics, review, expectedFingerprint); }
