import type { AuthenticatedContext } from "./auth.ts";
import { PERSISTENCE_CONFIG } from "./config.ts";
import type { AssessmentDraft } from "./assessment.ts";
import { getAssessmentRepository } from "./server-assessment-store.ts";
import { extractAccessToken } from "./server-auth.ts";
import { getManagedPostgresStore } from "./server-managed-persistence.ts";
import { scopeFromTenant } from "./tenancy.ts";
export async function createAssessmentForRequest(request: Request, auth: AuthenticatedContext, assessment: AssessmentDraft) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = getManagedPostgresStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.createAssessment(extractAccessToken(request), scope, assessment); } return getAssessmentRepository().create(scope, assessment); }
export async function findAssessmentForRequest(request: Request, auth: AuthenticatedContext, assessmentId: string) { const scope = scopeFromTenant(auth.tenant); if (PERSISTENCE_CONFIG.provider === "supabase-postgres") { const store = getManagedPostgresStore(); if (!store) throw new Error("Managed PostgreSQL persistence is not configured."); return store.findAssessment(extractAccessToken(request), scope, assessmentId); } return getAssessmentRepository().findById(scope, assessmentId); }
