# Executive report print presentation

REP-006 adds a route-scoped presentation layer for the executive report without changing report facts, evidence, review state, or provenance.

## User flow

1. Complete finding review and generate the executive report preview.
2. Review the report in the browser.
3. Use **Print preview**.
4. The browser receives an A4-oriented layout with print-safe typography, compact metrics, page-break controls, expanded evidence details, and hidden application navigation/actions.
5. Use the browser print dialog to print or save a local PDF. Formal product-managed PDF generation remains REP-007.

## Presentation rules

- A4 page geometry with bounded margins.
- Screen navigation, footer, buttons, and form actions are omitted from print output.
- Panels lose decorative backgrounds/radii and become document sections.
- Finding/recommendation cards avoid page breaks where practical.
- Closed evidence details are expanded for printed evidence traceability.
- Direct source locators remain visible.
- Styling cannot create, modify, suppress, or reinterpret findings or evidence.

## Security and privacy

The stylesheet introduces no data access, network calls, storage, credentials, or external services. It prints only information already present in the reviewed executive-report projection. Raw uploaded artifact content is not added.

## Validation

`tests/report-print.test.mjs` verifies the route-scoped stylesheet import, A4 print contract, hidden interactive controls, evidence expansion, page-break behavior, and absence of data-access logic in the presentation layer.
