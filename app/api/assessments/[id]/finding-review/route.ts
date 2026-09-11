import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { runDeterministicDiagnostics, type DiagnosticEnvelope } from "@/lib/diagnostics";
import { type FindingReview, validateDiagnosticEvidence } from "@/lib/finding-review";
import { diagnosticFingerprint, StaleFindingReviewError } from "@/lib/finding-review-persistence";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getFindingReviewRepository } from "@/lib/server-finding-review-store";
import { getProcessingRepository } from "@/lib/server-processing-store";
import { getExtractionReviewRepository } from "@/lib/server-review-store";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

function authError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

function state(id: string, permission: "finding-review:read" | "finding-review:write") {
  const auth = requireServerPermission(permission);
  const scope = scopeFromTenant(auth.tenant);
  if (!getAssessmentRepository().findById(scope, id)) return { response: NextResponse.json({ error: "Assessment not found." }, { status: 404 }) } as const;
  const processing = getProcessingRepository().find(scope, id);
  if (!processing) return { response: NextResponse.json({ error: "Process artifacts before reviewing findings." }, { status: 409 }) } as const;
  const extractionReview = getExtractionReviewRepository().find(scope, id, processing.extraction);
  if (!extractionReview || extractionReview.stale || !extractionReview.review.approved || !extractionReview.review.approvedAt) return { response: NextResponse.json({ error: "Approve the current extraction before reviewing findings." }, { status: 409 }) } as const;
  return { auth, scope, processing, extractionReview } as const;
}

function sameDeterministicDiagnostics(submitted: DiagnosticEnvelope, current: DiagnosticEnvelope) {
  return JSON.stringify({ ...current, generatedAt: submitted.generatedAt }) === JSON.stringify(submitted);
}

function samePersistedDiagnostics(submitted: DiagnosticEnvelope, persisted: DiagnosticEnvelope) {
  return JSON.stringify(submitted) === JSON.stringify(persisted);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const current = state(id, "finding-review:read");
    if ("response" in current) return current.response;
    const persisted = getFindingReviewRepository().find(current.scope, id);
    if (!persisted) return NextResponse.json({ assessmentId: id, persisted: null }, { headers: { "Cache-Control": "no-store" } });
    let stale = persisted.diagnostics.extractionApprovedAt !== current.extractionReview.review.approvedAt;
    if (!stale) {
      try { validateDiagnosticEvidence(persisted.diagnostics, current.processing.extraction, current.extractionReview.review); }
      catch { stale = true; }
    }
    return NextResponse.json({ assessmentId: id, persisted: { ...persisted, stale } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    throw error;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const current = state(id, "finding-review:write");
    if ("response" in current) return current.response;
    const body = await request.json() as { diagnostics?: unknown; review?: unknown };
    if (!body.diagnostics || typeof body.diagnostics !== "object" || !body.review || typeof body.review !== "object") return NextResponse.json({ error: "diagnostics and review are required." }, { status: 400 });
    const diagnostics = body.diagnostics as DiagnosticEnvelope;
    const review = body.review as FindingReview;
    if (diagnostics.assessmentId !== id) return NextResponse.json({ error: "Diagnostics assessment does not match route scope." }, { status: 400 });
    validateDiagnosticEvidence(diagnostics, current.processing.extraction, current.extractionReview.review);
    const canonical = runDeterministicDiagnostics({ assessmentId: id, extraction: current.processing.extraction, review: current.extractionReview.review });
    const existing = getFindingReviewRepository().find(current.scope, id);
    const trustedPromotedEnvelope = Boolean(existing && !existing.stale && samePersistedDiagnostics(diagnostics, existing.diagnostics));
    if (!sameDeterministicDiagnostics(diagnostics, canonical) && !trustedPromotedEnvelope) {
      return NextResponse.json({ error: "Submitted diagnostics do not match deterministic engine output or the exact current server-persisted promoted finding set." }, { status: 409 });
    }
    const fingerprint = diagnosticFingerprint(diagnostics);
    const saved = getFindingReviewRepository().save(current.scope, id, diagnostics, review, fingerprint);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    if (error instanceof StaleFindingReviewError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
