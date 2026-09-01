import { NextResponse } from "next/server";
import { TenantScopeError } from "@/lib/assessment-repository";
import { getAssessmentRepository, getServerTenantContext, getServerTenantScope } from "@/lib/server-assessment-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const assessment = getAssessmentRepository().findById(getServerTenantScope(), id);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { assessment, tenant: getServerTenantContext(), persistence: "server-sqlite-tenant-scoped" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof TenantScopeError) {
      return NextResponse.json({ error: "Assessment tenant scope is unavailable." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}
