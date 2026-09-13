import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { getReportRepository } from "@/lib/server-report-store";
import { generateCurrentExecutiveReport, ReportStateUnavailableError } from "@/lib/server-report-state";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

function authError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("report:read");
    const scope = scopeFromTenant(auth.tenant);
    const history = getReportRepository().list(scope, id);
    return NextResponse.json({ assessmentId: id, reports: [...history].reverse() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    if (error instanceof ReportStateUnavailableError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("report:write");
    const scope = scopeFromTenant(auth.tenant);
    const canonicalReport = generateCurrentExecutiveReport(scope, id);
    const snapshot = getReportRepository().save(scope, canonicalReport);
    return NextResponse.json(snapshot, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    if (error instanceof ReportStateUnavailableError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
