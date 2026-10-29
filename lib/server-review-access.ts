import type { AuthenticatedContext } from "./auth.ts";
import { PERSISTENCE_CONFIG } from "./config.ts";
import type { ExtractionReview } from "./extraction-review.ts";
import type { ExtractionEnvelope } from "./extraction.ts";
import { extractAccessToken } from "./server-auth.ts";
import { getExtractionReviewRepository } from "./server-review-store.ts";
import { SupabaseExtractionReviewStore } from "./supabase-extraction-review.ts";
import { scopeFromTenant } from "./tenancy.ts";
const globalStore = globalThis as typeof globalThis & { sugarSupabaseExtractionReviewStore?: SupabaseExtractionReviewStore };
function getManagedReviewStore() { if (PERSISTENCE_CONFIG.provider !== "supabase-postgres" || !PERSISTENCE_CONFIG.supabase) return null; if (!globalStore.sugarSupabaseExtractionReviewStore) globalStore.sugarSupabaseExtractionReviewStore = new SupabaseExtractionReviewStore(PERSISTENCE_CONFIG.supabase); return globalStore.sugarSupabaseExtractionReviewStore; }
export async function findExtractionReviewForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string, extraction: ExtractionEnvelope) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = getManagedReviewStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.find(extractAccessToken(request), scope, assessmentId, extraction); } return getExtractionReviewRepository().find(scope, assessmentId, extraction); }
export async function saveExtractionReviewForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string, extraction: ExtractionEnvelope, review: ExtractionReview, expectedFingerprint: string) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = getManagedReviewStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.save(extractAccessToken(request), scope, assessmentId, extraction, review, expectedFingerprint); } return getExtractionReviewRepository().save(scope, assessmentId, extraction, review, expectedFingerprint); }
