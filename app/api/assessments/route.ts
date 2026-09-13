import { NextResponse } from "next/server";
import { assessmentInputSchema, createAssessmentDraft } from "@/lib/assessment";
import { ActiveAssessmentLimitError, TenantScopeError } from "@/lib/assessment-repository";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { PRODUCT_LIMITS } from "@/lib/config";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { scopeFromTenant } from "@/lib/tenancy";

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
    const auth = requireServerPermission("assessment:create");
    const assessment = createAssessmentDraft(parsed.data);
    getAssessmentRepository().create(scopeFromTenant(auth.tenant), assessment);
    return NextResponse.json({
      assessment, tenant: auth.tenant, actor: { id: auth.user.id, role: auth.membership.role },
      persistence: "server-sqlite-authz-scoped"
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof ActiveAssessmentLimitError) {
      return NextResponse.json({ error: error.message, code: "ACTIVE_ASSESSMENT_LIMIT" }, { status: 409 });
    }
    if (error instanceof TenantScopeError) return NextResponse.json({ error: "Assessment tenant scope is unavailable." }, { status: 500 });
    return NextResponse.json({ error: "Assessment could not be persisted." }, { status: 500 });
  }
}
