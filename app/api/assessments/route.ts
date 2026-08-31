import { NextResponse } from "next/server";
import { assessmentInputSchema, createAssessmentDraft } from "@/lib/assessment";
import { ActiveAssessmentLimitError, LOCAL_DEMO_WORKSPACE_ID } from "@/lib/assessment-repository";
import { PRODUCT_LIMITS } from "@/lib/config";
import { getAssessmentRepository } from "@/lib/server-assessment-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (PRODUCT_LIMITS.maxPrimaryEntities !== 1 || PRODUCT_LIMITS.maxActiveAssessments !== 1) {
    return NextResponse.json({ error: "Server assessment limits are misconfigured." }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = assessmentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Assessment details are invalid.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const assessment = createAssessmentDraft(parsed.data);
    getAssessmentRepository().create(LOCAL_DEMO_WORKSPACE_ID, assessment);
    return NextResponse.json({ assessment, persistence: "server-sqlite-local-demo" }, { status: 201 });
  } catch (error) {
    if (error instanceof ActiveAssessmentLimitError) {
      return NextResponse.json({ error: error.message, code: "ACTIVE_ASSESSMENT_LIMIT" }, { status: 409 });
    }
    return NextResponse.json({ error: "Assessment could not be persisted." }, { status: 500 });
  }
}
