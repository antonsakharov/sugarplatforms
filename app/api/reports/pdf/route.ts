import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { generateReportPdf } from "@/lib/report-pdf";
import { requireServerPermission } from "@/lib/server-auth";
import { getReportRepository } from "@/lib/server-report-store";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16_384;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return Response.json({ error: "PDF export request is too large." }, { status: 413 });
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BYTES) return Response.json({ error: "PDF export request is too large." }, { status: 413 });
    const body = JSON.parse(text) as { assessmentId?: string; reportId?: string };
    if (!body.assessmentId || !body.reportId) return Response.json({ error: "assessmentId and reportId are required." }, { status: 400 });
    const auth = requireServerPermission("report:read");
    const scope = scopeFromTenant(auth.tenant);
    const snapshot = getReportRepository().findById(scope, body.assessmentId, body.reportId);
    if (!snapshot) return Response.json({ error: "Saved report not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const artifact = generateReportPdf(snapshot);
    const responseBody = artifact.bytes.slice().buffer as ArrayBuffer;
    return new Response(responseBody, { status: 200, headers: {
      "Content-Type": artifact.mediaType,
      "Content-Disposition": `attachment; filename="${artifact.filename}"`,
      "Content-Length": String(artifact.bytes.byteLength),
      "Cache-Control": "no-store",
      "X-Sugar-Pdf-Sha256": artifact.sha256,
      "X-Sugar-Pdf-Pages": String(artifact.pageCount),
      "X-Sugar-Diagnostic-Generated-At": artifact.generatedFromDiagnosticAt
    }});
  } catch (caught) {
    if (caught instanceof AuthenticationRequiredError) return Response.json({ error: caught.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (caught instanceof AuthorizationDeniedError) return Response.json({ error: caught.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const message = caught instanceof Error ? caught.message : "PDF export failed.";
    return Response.json({ error: message }, { status: caught instanceof SyntaxError ? 400 : 422, headers: { "Cache-Control": "no-store" } });
  }
}
