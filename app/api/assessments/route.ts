import { NextResponse } from "next/server";
import { assessmentInputSchema, createAssessmentDraft } from "@/lib/assessment";
import { PRODUCT_LIMITS } from "@/lib/config";

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

  return NextResponse.json({ assessment: createAssessmentDraft(parsed.data) }, { status: 201 });
}
