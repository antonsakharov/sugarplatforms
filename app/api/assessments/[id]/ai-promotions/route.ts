import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { promoteAiCandidate } from "@/lib/ai-finding-promotion";
import type { AiFindingEnvelope } from "@/lib/ai-findings";
import { createFindingReview } from "@/lib/finding-review";
import { diagnosticFingerprint } from "@/lib/finding-review-persistence";
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("finding-review:write");
    const scope = scopeFromTenant(auth.tenant);
    if (!getAssessmentRepository().findById(scope, id)) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    const processing = getProcessingRepository().find(scope, id);
    if (!processing) return NextResponse.json({ error: "Process artifacts before promoting AI candidates." }, { status: 409 });
    const extractionReview = getExtractionReviewRepository().find(scope, id, processing.extraction);
    if (!extractionReview || extractionReview.stale || !extractionReview.review.approved || !extractionReview.review.approvedAt) {
      return NextResponse.json({ error: "Approve the current extraction before promoting AI candidates." }, { status: 409 });
    }
    const persisted = getFindingReviewRepository().find(scope, id);
    if (!persisted || persisted.stale) return NextResponse.json({ error: "Run current diagnostics before promoting AI candidates." }, { status: 409 });

    const body = await request.json() as { candidates?: unknown; candidateId?: unknown };
    if (!body.candidates || typeof body.candidates !== "object" || typeof body.candidateId !== "string" || !body.candidateId.trim()) {
      return NextResponse.json({ error: "candidates and candidateId are required." }, { status: 400 });
    }
    const result = promoteAiCandidate(
      id,
      persisted.diagnostics,
      body.candidates as AiFindingEnvelope,
      processing.extraction,
      extractionReview.review,
      body.candidateId
    );
    const review = createFindingReview(result.diagnostics);
    const fingerprint = diagnosticFingerprint(result.diagnostics);
    const saved = getFindingReviewRepository().save(scope, id, result.diagnostics, review, fingerprint);
    return NextResponse.json({ ...saved, promotion: result.promotion }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
