import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { parseArtifact } from "../lib/artifact-parser.ts";

const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
const pages = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
const page = "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>";
const content = "BT (CRM owns canonical Customer ID) Tj ET";

function objstm() {
  const entries = [[1, catalog], [2, pages], [3, page]];
  let payload = "";
  const index = entries.map(([id, value]) => {
    const entry = `${id} ${payload.length}`;
    payload += `${value}\n`;
    return entry;
  }).join(" ") + " ";
  const compressed = deflateSync(Buffer.from(index + payload, "latin1"));
  return `<< /Type /ObjStm /N 3 /First ${index.length} /Length ${compressed.length} /Filter /FlateDecode >> stream\n${compressed.toString("latin1")}\nendstream`;
}

function pdf(options = {}) {
  const compressed = options.compressed ?? false;
  const objects = compressed
    ? [[4, `<< /Length ${content.length} >> stream\n${content}\nendstream`], [9, objstm()]]
    : [[1, catalog], [2, pages], [3, page], [4, `<< /Length ${content.length} >> stream\n${content}\nendstream`]];
  if (options.infoBody !== undefined) objects.push([8, options.infoBody]);
  let raw = "%PDF-1.5\n";
  const offsets = new Map();
  for (const [id, body] of objects) {
    offsets.set(id, Buffer.byteLength(raw, "latin1"));
    raw += `${id} 0 obj\n${body}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(raw, "latin1");
  offsets.set(10, xrefOffset);
  const size = 11;
  const entries = [];
  const entryIds = options.entryIds ?? Array.from({ length: size }, (_, id) => id);
  for (const id of entryIds) {
    const override = options.overrideEntry?.[id];
    const entry = override ?? (id === 0 ? [0, 0, 65535]
      : compressed && id <= 3 ? [2, 9, id - 1]
      : offsets.has(id) ? [1, offsets.get(id), 0] : [0, 0, 0]);
    const [type, offset, gen] = entry;
    const widths = options.entryWidths ?? [1, 4, 2];
    const bytes = Buffer.alloc(widths.reduce((sum, width) => sum + width, 0));
    let position = 0;
    for (const [value, width] of [[type, widths[0]], [offset, widths[1]], [gen, widths[2]]]) {
      for (let byte = width - 1; byte >= 0; byte -= 1) {
        bytes[position + byte] = Math.floor(value / (256 ** (width - byte - 1))) % 256;
      }
      position += width;
    }
    entries.push(bytes);
  }
  const decoded = Buffer.concat(entries);
  const encoded = deflateSync(decoded);
  const extras = options.headerExtra ?? "";
  const header = `<< /Type /XRef /Size ${options.size ?? size} /Root ${options.root ?? "1 0 R"} /W ${options.w ?? "[1 4 2]"} ${options.index ?? ""} /Length ${options.length ?? encoded.length} /Filter ${options.filter ?? "/FlateDecode"} ${extras} >>`;
  const finalHeader = options.headerTransform ? options.headerTransform(header) : header;
  raw += `10 0 obj\n${finalHeader} stream\n${encoded.toString("latin1")}\nendstream\nendobj\n`;
  const trailer = `startxref\n${options.startxref ?? xrefOffset}\n%%EOF\n`;
  raw += options.trailerTransform ? options.trailerTransform(trailer) : trailer;
  if (options.suffix) raw += options.suffix;
  return Buffer.from(raw, "latin1");
}

function reject(input, pattern = /cross-reference stream/) {
  assert.throws(() => parseArtifact("xref.pdf", input), pattern);
}

test("single Flate xref stream verifies physical offsets and page evidence", () => {
  const result = parseArtifact("xref.pdf", pdf());
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
});

test("type 2 xref entries verify compressed page-tree objects and page provenance", () => {
  const result = parseArtifact("xref-compressed.pdf", pdf({ compressed: true, index: "/Index [0 11]" }));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.match(result.sourceSegments[0].content, /CRM owns/);
});

test("incorrect startxref, repeated revisions and classic xref tables fail closed", () => {
  reject(pdf({ startxref: 7 }), /startxref/);
  reject(pdf({ suffix: "startxref\n1\n%%EOF\n" }), /revisions/);
  reject(Buffer.from("%PDF-1.5\nxref\n0 1\n0000000000 65535 f\nstartxref\n9\n%%EOF", "latin1"), /cross-reference table/);
});

test("hybrid and incremental xref pointers are rejected", () => {
  reject(pdf({ headerExtra: "/Prev 12" }), /revisions/);
  reject(pdf({ headerExtra: "/XRefStm 12" }), /revisions/);
});

test("xref stream rejects wrong direct offsets and orphan objects", () => {
  reject(pdf({ overrideEntry: { 4: [1, 1, 0] } }), /offset/);
  reject(pdf({ overrideEntry: { 4: [0, 0, 0] } }), /free entry/);
  reject(pdf({ overrideEntry: { 4: [1, 0, 1] } }), /generation/);
});

test("xref stream rejects invalid compressed index and wrong object-stream reference", () => {
  reject(pdf({ compressed: true, overrideEntry: { 2: [2, 9, 0] } }), /compressed object stream\/index/);
  reject(pdf({ compressed: true, overrideEntry: { 2: [2, 8, 1] } }), /compressed object stream\/index/);
  reject(pdf({ compressed: true, overrideEntry: { 2: [2, 9, 8] } }), /compressed object stream\/index/);
});

test("xref stream rejects unsupported widths, partial Index, invalid Size and Root", () => {
  reject(pdf({ w: "[0 4 2]" }), /decoded length/);
  reject(pdf({ index: "/Index [1 10]" }), /Index/);
  reject(pdf({ size: 5000 }), /Size/);
  reject(pdf({ root: "8 0 R" }), /Root/);
});

test("xref stream rejects unsupported filters, wrong Length and duplicate xref declaration", () => {
  reject(pdf({ filter: "/LZWDecode" }), /dictionary/);
  reject(pdf({ length: 1 }), /Length/);
  reject(pdf({ headerExtra: "/W [1 4 2]" }), /duplicate W/);
});

test("xref stream rejects unknown entry types and unindexed compressed objects", () => {
  reject(pdf({ overrideEntry: { 4: [3, 0, 0] } }), /entry type/);
  reject(pdf({ compressed: true, overrideEntry: { 3: [0, 0, 0] } }), /free entry/);
});

test("minimal legacy demo PDFs without xref remain supported", () => {
  const legacy = Buffer.from(`%PDF-1.5\n1 0 obj ${catalog} endobj\n2 0 obj ${pages} endobj\n3 0 obj ${page} endobj\n4 0 obj << >> stream\n${content}\nendstream endobj\n%%EOF`, "latin1");
  assert.equal(parseArtifact("legacy.pdf", legacy).sourceSegments[0].locator.page, 1);
});

const validIds = "/ID [<" + "ab".repeat(16) + "> <" + "CD".repeat(16) + ">]";
const safeInfo = "<< /Producer (Internal architecture tool) /Title (DO NOT EXTRACT DOCUMENT METADATA) >>";

test("xref stream accepts bounded Info and ID without promoting metadata to evidence", () => {
  const result = parseArtifact("metadata.pdf", pdf({
    infoBody: safeInfo, headerExtra: "/Info 8 0 R " + validIds,
  }));
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
  assert.doesNotMatch(JSON.stringify(result.sourceSegments), /DO NOT EXTRACT|Internal architecture tool|abababab/);
});

test("xref stream ID-only metadata remains compatible with physical page evidence", () => {
  const result = parseArtifact("id-only.pdf", pdf({ headerExtra: validIds }));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
});

test("xref stream validates Info as a live direct dictionary, including compressed page trees", () => {
  const result = parseArtifact("compressed-metadata.pdf", pdf({
    compressed: true, infoBody: safeInfo, headerExtra: "/Info 8 0 R " + validIds,
  }));
  assert.match(result.sourceSegments[0].content, /CRM owns/);
  reject(pdf({ headerExtra: "/Info 8 0 R" }), /Info must reference/);
  reject(pdf({ compressed: true, headerExtra: "/Info 1 0 R" }), /Info must reference/);
  reject(pdf({ infoBody: safeInfo, headerExtra: "/Info 8 1 R" }), /invalid Info/);
  reject(pdf({ infoBody: safeInfo, headerExtra: "/Info 1 0 R" }), /Info must reference/);
});

test("xref stream rejects Info references to pages, streams and cross-reference objects", () => {
  reject(pdf({ headerExtra: "/Info 3 0 R" }), /Info must reference/);
  reject(pdf({ headerExtra: "/Info 4 0 R" }), /Info must reference/);
  reject(pdf({ headerExtra: "/Info 10 0 R" }), /Info must reference/);
  reject(pdf({ infoBody: "<< /Type /Catalog >>", headerExtra: "/Info 8 0 R" }), /Info must reference/);
  reject(pdf({ infoBody: "not a dictionary", headerExtra: "/Info 8 0 R" }), /Info must reference/);
});

test("xref stream rejects duplicate, malformed and unsupported metadata fields", () => {
  reject(pdf({ infoBody: safeInfo, headerExtra: "/Info 8 0 R /Info 8 0 R" }), /duplicate Info/);
  reject(pdf({ headerExtra: validIds + " " + validIds }), /duplicate ID/);
  reject(pdf({ headerExtra: "/ID [(literal) (literal)]" }), /malformed ID/);
  reject(pdf({ headerExtra: "/ID [<abc> <def>]" }), /malformed ID/);
  reject(pdf({ headerExtra: "/ID [<" + "ab".repeat(65) + "> <" + "cd".repeat(16) + ">]" }), /malformed ID/);
  reject(pdf({ headerExtra: "/Info [8 0 R]" }), /malformed Info/);
  reject(pdf({ headerExtra: "/Metadata 8 0 R" }), /unsupported/);
});

test("xref stream preserves fail-closed revision, encryption and object-index checks with metadata", () => {
  reject(pdf({ headerExtra: validIds + " /Encrypt 8 0 R" }), /encrypted|revisions/);
  reject(pdf({ headerExtra: validIds + " /Prev 20" }), /revisions/);
  reject(pdf({ headerExtra: validIds + " /XRefStm 20" }), /revisions/);
  reject(pdf({ infoBody: safeInfo, headerExtra: "/Info 8 0 R " + validIds, overrideEntry: { 8: [1, 1, 0] } }), /offset/);
  reject(pdf({ infoBody: safeInfo, headerExtra: "/Info 8 0 R " + validIds, overrideEntry: { 8: [0, 0, 0] } }), /free entry/);
});

test("xref stream rejects nested, ambiguous or oversized dictionary content", () => {
  reject(pdf({ headerExtra: "/Root 1 0 R" }), /duplicate Root/);
  reject(pdf({ headerExtra: "/Filter /FlateDecode" }), /duplicate Filter/);
  reject(pdf({ headerExtra: validIds + " /Unknown << /Info 8 0 R >>" }), /unsupported/);
  reject(pdf({ headerExtra: validIds + " " + " ".repeat(5000) }), /dictionary/);
});

// Decision 096: bounded xref-stream lexical compatibility. These tests use
// physical byte offsets from the unmodified object prefix, not reconstructed
// offsets, and assert that comments never become evidence.
test("xref dictionary accepts CRLF and LF comments around Type, Filter and W", () => {
  const result = parseArtifact("commented-xref.pdf", pdf({
    headerTransform: (header) => header
      .replace("/Type /XRef", "/Type% harmless generator note\r\n/XRef")
      .replace("/W [1 4 2]", "/W% width comment\n[1 4 2]")
      .replace("/Filter /FlateDecode", "/Filter% encoding comment\r/FlateDecode"),
  }));
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
  assert.doesNotMatch(JSON.stringify(result.sourceSegments), /harmless generator|width comment|encoding comment/);
});

test("xref dictionary permits PDF NUL, HT and form-feed token separators", () => {
  const result = parseArtifact("pdf-whitespace.pdf", pdf({
    headerTransform: (header) => header
      .replace("/Type /XRef", "/Type\0/XRef")
      .replace("/Size 11", "/Size\f11")
      .replace("/Filter /FlateDecode", "/Filter\t/FlateDecode"),
  }));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
});

test("xref metadata comments stay outside hex IDs and never become evidence", () => {
  const result = parseArtifact("xref-id-comments.pdf", pdf({
    infoBody: safeInfo,
    headerExtra: "/Info 8 0 R " + validIds,
    headerTransform: (header) => header
      .replace("/Info 8 0 R", "/Info% metadata field\n8 0 R")
      .replace("/ID [", "/ID% identifier field\n[")
      .replace("> <", ">% identifier separator\n<"),
  }));
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
  assert.doesNotMatch(JSON.stringify(result.sourceSegments), /metadata field|identifier field|identifier separator|DO NOT EXTRACT/);
});

test("terminal startxref permits bounded PDF whitespace and comments", () => {
  const result = parseArtifact("xref-terminal.pdf", pdf({
    trailerTransform: (trailer) => trailer.replace("startxref\n", "startxref% offset note\r\n\f\0")
      .replace("\n%%EOF", "% final offset comment\r\n%%EOF"),
  }));
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("comments cannot repair malformed offsets, object generations or compressed indexes", () => {
  reject(pdf({ headerTransform: (header) => header.replace("/Type /XRef", "/Type% note\n/XRef"), startxref: 7 }), /startxref/);
  reject(pdf({ headerTransform: (header) => header.replace("/Filter /FlateDecode", "/Filter% note\n/FlateDecode"), overrideEntry: { 4: [1, 1, 0] } }), /offset/);
  reject(pdf({ compressed: true, headerTransform: (header) => header.replace("/W [1 4 2]", "/W% note\n[1 4 2]"), overrideEntry: { 2: [2, 9, 0] } }), /compressed object stream\/index/);
});

test("xref comments do not permit duplicate, unknown, revision or encrypted fields", () => {
  reject(pdf({ headerExtra: "/Root% note\n1 0 R" }), /duplicate Root/);
  reject(pdf({ headerExtra: "/Unexpected% note\n8" }), /unsupported/);
  reject(pdf({ headerExtra: "/Prev% note\n1" }), /revisions/);
  reject(pdf({ headerExtra: "/Encrypt% note\n8 0 R" }), /encrypted|revisions/);
});

test("xref lexical parsing rejects invalid whitespace, comments in hex and oversized headers", () => {
  reject(pdf({ headerTransform: (header) => header.replace("/Size 11", "/Size\v11") }), /non-PDF whitespace/);
  reject(pdf({ headerTransform: (header) => header.replace("/Size 11", "/Size\u00a011") }), /non-PDF whitespace/);
  reject(pdf({ headerExtra: "/ID [<" + "ab".repeat(8) + "% comment\n" + "ab".repeat(8) + "> <" + "cd".repeat(16) + ">]" }), /malformed ID/);
  reject(pdf({ headerExtra: "%" + "x".repeat(4100) + "\n" }), /dictionary|byte budget/);
});

test("terminal comments cannot hide a revision, suffix or malformed EOF", () => {
  reject(pdf({ suffix: "startxref\n1\n%%EOF\n" }), /revisions/);
  reject(pdf({ trailerTransform: (trailer) => trailer.replace("\n%%EOF", "\n% missing EOF\n") }), /revisions|startxref|EOF/);
  reject(pdf({ trailerTransform: (trailer) => trailer.replace("\n%%EOF", "\n% comment\n%%EOF") + "unexpected" }), /startxref|EOF/);
  reject(pdf({ trailerTransform: (trailer) => trailer.replace("startxref\n", "startxref%" + "x".repeat(4100) + "\n") }), /byte budget/);
});

// Decision 097: omitted /W fields use PDF-defined defaults, never guessed
// object offsets, compressed indexes, or physical page coordinates.
test("zero-width generation field defaults to zero for direct objects", () => {
  const result = parseArtifact("xref-default-generation.pdf", pdf({ w: "[1 4 0]", entryWidths: [1, 4, 0] }));
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
});

test("zero-width generation retains metadata separation and comment compatibility", () => {
  const result = parseArtifact("xref-default-metadata.pdf", pdf({
    w: "[1 4 0]", entryWidths: [1, 4, 0], infoBody: safeInfo,
    headerExtra: "/Info 8 0 R " + validIds,
    headerTransform: (header) => header.replace("/W [1 4 0]", "/W% omitted generation\n[1 4 0]"),
  }));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.doesNotMatch(JSON.stringify(result.sourceSegments), /DO NOT EXTRACT|omitted generation/);
});

test("zero-width type defaults to in-use and cannot disguise a free object zero", () => {
  reject(pdf({ w: "[0 4 2]", entryWidths: [0, 4, 2] }), /offset|free entry|unindexed|object zero/);
});

test("zero-width offset defaults to zero and cannot invent physical positions", () => {
  reject(pdf({ w: "[1 0 2]", entryWidths: [1, 0, 2] }), /offset/);
});

test("all-zero widths and excessive widths fail closed", () => {
  reject(pdf({ w: "[0 0 0]", entryWidths: [0, 0, 0] }), /W widths/);
  reject(pdf({ w: "[1 5 0]" }), /W widths/);
});

test("omitted compressed index cannot masquerade as distinct object indexes", () => {
  reject(pdf({ compressed: true, w: "[1 4 0]", entryWidths: [1, 4, 0] }), /compressed object stream\/index|duplicate compressed index/);
});

test("default generation cannot bypass direct object offset validation", () => {
  reject(pdf({ w: "[1 4 0]", entryWidths: [1, 4, 0], overrideEntry: { 4: [1, 1, 0] } }), /offset/);
  reject(pdf({ w: "[1 4 0]", entryWidths: [1, 4, 0], overrideEntry: { 4: [0, 0, 0] } }), /free entry/);
});

test("declared widths must match exact decompressed entry stride", () => {
  reject(pdf({ w: "[1 4 0]" }), /decoded length/);
  reject(pdf({ w: "[1 4 2]", entryWidths: [1, 4, 0] }), /decoded length/);
});

// Decision 098: sparse /Index ranges enumerate only the explicitly represented
// entries. Missing ranges are implicitly free, never inferred as evidence.
const sparseDirect = { index: "/Index [0 5 10 1]", entryIds: [0, 1, 2, 3, 4, 10] };
const sparseCompressed = { compressed: true, index: "/Index [0 5 9 2]", entryIds: [0, 1, 2, 3, 4, 9, 10] };

test("sparse disjoint Index ranges preserve direct page evidence", () => {
  const result = parseArtifact("sparse.pdf", pdf(sparseDirect));
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
});

test("sparse ranges preserve compressed object indexes and page evidence", () => {
  const result = parseArtifact("sparse-compressed.pdf", pdf(sparseCompressed));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.match(result.sourceSegments[0].content, /CRM owns/);
});

test("sparse ranges support live Info metadata without promoting it to evidence", () => {
  const result = parseArtifact("sparse-info.pdf", pdf({
    ...sparseDirect, index: "/Index [0 5 8 1 10 1]", entryIds: [0, 1, 2, 3, 4, 8, 10],
    infoBody: safeInfo, headerExtra: "/Info 8 0 R " + validIds,
  }));
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.doesNotMatch(JSON.stringify(result.sourceSegments), /DO NOT EXTRACT|Internal architecture tool/);
});

test("sparse ranges accept PDF comments while keeping byte offsets unchanged", () => {
  const result = parseArtifact("sparse-comments.pdf", pdf({
    ...sparseDirect, headerTransform: (header) => header.replace("/Index [0 5 10 1]", "/Index% sparse ranges\n[0 5 10 1]"),
  }));
  assert.match(result.sourceSegments[0].content, /CRM owns/);
});

test("sparse ranges reject missing direct and compressed live objects", () => {
  reject(pdf({ index: "/Index [0 4 10 1]", entryIds: [0, 1, 2, 3, 10] }), /unindexed/);
  reject(pdf({ compressed: true, index: "/Index [0 5 10 1]", entryIds: [0, 1, 2, 3, 4, 10] }), /unindexed/);
  reject(pdf({ ...sparseDirect, overrideEntry: { 4: [0, 0, 0] } }), /free entry/);
});

test("sparse ranges reject overlapping, unordered, empty, and missing-zero intervals", () => {
  for (const index of [
    "/Index [0 5 4 2 10 1]", "/Index [0 5 2 1 10 1]",
    "/Index [0 5 5 0 10 1]", "/Index [1 4 10 1]",
    "/Index [0 5 10 1 8 1]", "/Index [0 5 10 2]",
  ]) reject(pdf({ ...sparseDirect, index }), /Index/);
});

test("sparse ranges reject malformed arrays and oversized range counts", () => {
  for (const index of ["/Index [0 5 10]", "/Index [0 5 -1 1]", "/Index [0 5 10 1 11]", "/Index []"]) {
    reject(pdf({ ...sparseDirect, index }), /Index/);
  }
  const huge = "/Index [" + Array.from({ length: 130 }, (_, i) => `${i} 1`).join(" ") + "]";
  reject(pdf({ ...sparseDirect, index: huge }), /Index/);
});

test("sparse ranges reject entry-count mismatch and fabricated physical offsets", () => {
  reject(pdf({ index: "/Index [0 5 10 1]" }), /decoded length/);
  reject(pdf({ ...sparseDirect, overrideEntry: { 4: [1, 1, 0] } }), /offset/);
  reject(pdf({ ...sparseCompressed, overrideEntry: { 3: [2, 9, 0] } }), /compressed object stream\/index/);
});

test("sparse ranges cannot turn object zero into an in-use entry", () => {
  reject(pdf({ ...sparseDirect, overrideEntry: { 0: [1, 0, 0] } }), /object zero/);
});
