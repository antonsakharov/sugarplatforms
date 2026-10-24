# Decision 071 — PDF page-tree provenance

Date: 2026-10-09
Status: Accepted

Physical page numbers are assigned only by traversing the Catalog /Pages /Kids tree, checking Parent links, /Count values, duplicate/cyclic references and the 150-page MVP limit. Object declaration order is not page order. Ambiguous or invalid trees fail closed; documents with no provable Catalog can only emit fragment locators. Incremental PDF object revisions require a production parser.

The canonical recovery branch contains the last published application baseline and this page-tree hardening. The newer approved 2026-10-09 ZIP is the full working package; remaining local-to-GitHub changes must be synchronized and validated before merge.
