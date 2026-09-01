import { NextResponse } from "next/server";
import { assessmentInputSchema, createAssessmentDraft } from "@/lib/assessment";
import { ActiveAssessmentLimitError, TenantScopeError } from "@/lib/assessment-repository";
import { PRODUCT_LIMITS } from "@/lib/config";
import { getAssessmentRepository, getServerTenantContext, getServerTenantScope } from "@/lib/server-assessment-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (PRODUCT_LIMITS.maxPrimaryEntities !== 1 || PRODUCT_LIMITS.maxActiveAssessments !== 1) {
    return NextResponse.json({ error: "Server assessment limits are misconfigured." }, { status: 500 });
  }

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }

  const parsed = assessmentInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Assessment details are invalid.", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const tenant = getServerTenantContext();
    const assessment = createAssessmentDraft(parsed.data);
    getAssessmentRepository().create(getServerTenantScope(), assessment);
    return NextResponse.json({ assessment, tenant, persistence: "server-sqlite-tenant-scoped" }, { status: 201 });
  } catch (error) {
    if (error instanceof ActiveAssessmentLimitError) {
      return NextResponse.json({ error: error.message, code: "ACTIVE_ASSESSMENT_LIMIT" }, { status: 409 });
    }
    if (error instanceof TenantScopeError) {
      return NextResponse.json({ error: "Assessment tenant scope is unavailable." }, { status: 500 });
    }
    return NextResponse.json({ error: "Assessment could not be persisted." }, { status: 500 });
  }
}
