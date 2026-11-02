import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { findAssessmentForRequest } from "@/lib/server-assessment-access";
import { findProcessingForRequest } from "@/lib/server-processing-access";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; try { const auth = await requireServerPermission(request, "artifact:read"); if (!await findAssessmentForRequest(request, auth, id)) return NextResponse.json({ error: "Assessment not found." }, { status: 404 }); const snapshot = await findProcessingForRequest(request, auth, id); if (!snapshot) return NextResponse.json({ error: "No persisted processing state exists for this assessment." }, { status: 404 }); return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } }); } catch (error) { if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 }); if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 }); throw error; } }
