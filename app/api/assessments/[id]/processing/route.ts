import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getProcessingRepository } from "@/lib/server-processing-store";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("artifact:read");
    const scope = scopeFromTenant(auth.tenant);
    if (!getAssessmentRepository().findById(scope, id)) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }
    const snapshot = getProcessingRepository().find(scope, id);
    if (!snapshot) {
      return NextResponse.json({ error: "No persisted processing state exists for this assessment." }, { status: 404 });
    }
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
