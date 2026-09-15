import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { createExtractionReview, type ExtractionReview } from "@/lib/extraction-review";
import { extractionFingerprint, StaleExtractionReviewError } from "@/lib/review-persistence";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getProcessingRepository } from "@/lib/server-processing-store";
import { getExtractionReviewRepository } from "@/lib/server-review-store";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

function authError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

function assessmentState(id: string, permission: "extraction-review:read" | "extraction-review:write") {
  const auth = requireServerPermission(permission);
  const scope = scopeFromTenant(auth.tenant);
  if (!getAssessmentRepository().findById(scope, id)) return { response: NextResponse.json({ error: "Assessment not found." }, { status: 404 }) } as const;
  const processing = getProcessingRepository().find(scope, id);
  if (!processing) return { response: NextResponse.json({ error: "Process artifacts before reviewing extraction." }, { status: 409 }) } as const;
  return { auth, scope, processing } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const state = assessmentState(id, "extraction-review:read");
    if ("response" in state) return state.response;
    const currentFingerprint = extractionFingerprint(state.processing.extraction);
    const persisted = getExtractionReviewRepository().find(state.scope, id, state.processing.extraction);
    const review = persisted && !persisted.stale ? persisted.review : createExtractionReview(state.processing.extraction.objects);
    return NextResponse.json({
      assessmentId: id,
      extraction: state.processing.extraction,
      extractionFingerprint: currentFingerprint,
      review,
      stalePersistedReview: Boolean(persisted?.stale),
      updatedAt: persisted && !persisted.stale ? persisted.updatedAt : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    throw error;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const state = assessmentState(id, "extraction-review:write");
    if ("response" in state) return state.response;
    const body = await request.json() as { extractionFingerprint?: unknown; review?: unknown };
    if (typeof body.extractionFingerprint !== "string" || !body.review || typeof body.review !== "object") {
      return NextResponse.json({ error: "extractionFingerprint and review are required." }, { status: 400 });
    }
    const saved = getExtractionReviewRepository().save(
      state.scope,
      id,
      state.processing.extraction,
      body.review as ExtractionReview,
      body.extractionFingerprint
    );
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    if (error instanceof StaleExtractionReviewError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
