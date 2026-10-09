# Formal PDF Export

REP-007 adds a product-managed PDF export for saved executive-report snapshots.

## User flow

1. Complete extraction review, diagnostics, finding review, maturity, recommendations, and executive report generation.
2. On `/assessment/<id>/report`, choose **Save report version**.
3. The immutable browser-local snapshot receives a monotonic `v1`, `v2`, ... version.
4. Choose **Download formal PDF** for that saved version.
5. The client sends only the saved structured report snapshot to `POST /api/reports/pdf`.
6. The server revalidates the snapshot and returns a deterministic `application/pdf` attachment.

An unsaved live preview cannot be exported as a formal PDF.

## Security and provenance

- PDF generation consumes only the immutable reviewed report snapshot.
- The snapshot must pass the same single-assessment and diagnostic-provenance checks as JSON export.
- Raw uploaded artifact bytes or parsed source content are not accepted by the endpoint and are not added to the PDF.
- Artifact inventory remains metadata-only.
- Findings and recommendations remain accepted-findings-only projections from the reviewed diagnostic version.
- The endpoint is bounded to a 1 MB structured snapshot request and returns `Cache-Control: no-store`.
- Response headers expose the PDF page count, SHA-256 checksum, and diagnostic generation timestamp.
- PDF generation does not call an external service and requires no credential.

## PDF adapter

`lib/report-pdf.ts` implements a deterministic bounded PDF 1.4 writer using built-in Helvetica fonts. It renders:

- report title/version and diagnostic provenance;
- executive summary;
- assessment scope and artifact metadata;
- focused maturity rationale;
- prioritized recommendations;
- top accepted findings and evidence coordinates;
- 90-day action plan;
- evidence appendix;
- report limitations.

The adapter normalizes unsupported non-ASCII glyphs to a safe printable fallback because the current dependency-free PDF writer uses PDF built-in Type 1 fonts. Full Unicode font embedding is production polish, not a reason to send data to an external PDF service.

## Production boundary

The current export is a working local/server adapter, not a signed enterprise record. Production readiness still requires authenticated tenant authorization, durable server-backed report snapshots, private report storage, audit/deletion controls, and (if required) digital signing or immutable retention.
