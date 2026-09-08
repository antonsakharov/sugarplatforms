import { generateReportPdf } from "@/lib/report-pdf";
import type { ReportSnapshot } from "@/lib/report-versioning";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 1_000_000;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Report snapshot exceeds the PDF export request limit." }, { status: 413 });
    }
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Report snapshot exceeds the PDF export request limit." }, { status: 413 });
    }
    const snapshot = JSON.parse(text) as ReportSnapshot;
    const artifact = generateReportPdf(snapshot);
    const body = artifact.bytes.slice().buffer as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": artifact.mediaType,
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "Content-Length": String(artifact.bytes.byteLength),
        "Cache-Control": "no-store",
        "X-Sugar-Pdf-Sha256": artifact.sha256,
        "X-Sugar-Pdf-Pages": String(artifact.pageCount),
        "X-Sugar-Diagnostic-Generated-At": artifact.generatedFromDiagnosticAt
      }
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "PDF export failed.";
    const status = caught instanceof SyntaxError ? 400 : 422;
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
