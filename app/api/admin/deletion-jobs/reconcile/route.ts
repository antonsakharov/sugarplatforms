import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { reconcileDueDeletionJobs } from "@/lib/deletion-jobs";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentLifecycleRepository } from "@/lib/server-assessment-lifecycle";
import { getDeletionJobRepository } from "@/lib/server-deletion-jobs";
import { getArtifactStorage } from "@/lib/server-artifact-storage";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function POST() {
  try {
    const auth = requireServerPermission("assessment:delete");
    const result = await reconcileDueDeletionJobs({
      jobs: getDeletionJobRepository(),
      lifecycle: getAssessmentLifecycleRepository(),
      storage: getArtifactStorage(),
      scope: scopeFromTenant(auth.tenant),
      actorUserId: auth.user.id,
      limit: 20
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
