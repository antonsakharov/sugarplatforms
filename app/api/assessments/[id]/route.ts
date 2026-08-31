import { NextResponse } from "next/server";
import { LOCAL_DEMO_WORKSPACE_ID } from "@/lib/assessment-repository";
import { getAssessmentRepository } from "@/lib/server-assessment-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = getAssessmentRepository().findById(LOCAL_DEMO_WORKSPACE_ID, id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { assessment, persistence: "server-sqlite-local-demo" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
