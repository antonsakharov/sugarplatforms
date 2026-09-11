import { NextResponse } from "next/server";
import { TenantScopeError } from "@/lib/assessment-repository";
import { AssessmentDeletionNotFoundError } from "@/lib/assessment-lifecycle";
import { requestAssessmentDeletion } from "@/lib/deletion-jobs";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getAssessmentLifecycleRepository } from "@/lib/server-assessment-lifecycle";
import { getDeletionJobRepository } from "@/lib/server-deletion-jobs";
import { getArtifactStorage } from "@/lib/server-artifact-storage";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("assessment:read");
    const assessment = getAssessmentRepository().findById(scopeFromTenant(auth.tenant), id);
    if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(
      { assessment, tenant: auth.tenant, actor: { id: auth.user.id, role: auth.membership.role }, persistence: "server-sqlite-authz-scoped" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (error instanceof TenantScopeError) return NextResponse.json({ error: "Assessment tenant scope is unavailable." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("assessment:delete");
    const receipt = await requestAssessmentDeletion({
      jobs: getDeletionJobRepository(),
      lifecycle: getAssessmentLifecycleRepository(),
      storage: getArtifactStorage(),
      scope: scopeFromTenant(auth.tenant),
      assessmentId: id,
      actorUserId: auth.user.id
    });
    return NextResponse.json({ deleted: true, receipt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AssessmentDeletionNotFoundError) return NextResponse.json({ error: error.message }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (error instanceof TenantScopeError) return NextResponse.json({ error: "Assessment tenant scope is unavailable." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "Assessment deletion is queued for bounded reconciliation. Review the administrator deletion-jobs endpoint and audit trail." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}
