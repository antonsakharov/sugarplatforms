import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { listAuditForRequest } from "@/lib/server-deletion-ops-access";
import { scopeFromTenant } from "@/lib/tenancy";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; try { const auth = await requireServerPermission(request, "audit:read"); const events = await listAuditForRequest(request, scopeFromTenant(auth.tenant), id); return NextResponse.json({ assessmentId: id, events }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } }); if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } }); throw error; } }
