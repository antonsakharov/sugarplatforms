import test from "node:test";
import assert from "node:assert/strict";
import { parseArtifact } from "../lib/artifact-parser.ts";

const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
const pages = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
const page = "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>";
const content = "BT (CRM owns canonical Customer ID) Tj ET";

function pdf(options = {}) {
  const eol = options.eol ?? "\n";
  const objects = [
    [1, options.catalog ?? catalog], [2, pages], [3, page],
    [4, `<< /Length ${content.length} >> stream${eol}${content}${eol}endstream`],
  ];
  let raw = `%PDF-1.4${eol}`;
  const offsets = new Map();
  for (const [id, body] of objects) {
    offsets.set(id, Buffer.byteLength(raw, "latin1"));
    raw += `${id} 0 obj${eol}${body}${eol}endobj${eol}`;
  }
  const xrefOffset = Buffer.byteLength(raw, "latin1");
  const entries = [];
  for (let id = 0; id < 6; id += 1) {
    const entry = options.overrideEntry?.[id] ?? (id === 0 ? [0, 65535, "f"] : offsets.has(id) ? [offsets.get(id), 0, "n"] : [0, 0, "f"]);
    const [offset, generation, status] = entry;
    entries.push(`${String(offset).padStart(10, "0")} ${String(generation).padStart(5, "0")} ${status} `);
  }
  const section = options.subsections
    ? `0 2${eol}${entries.slice(0, 2).join(eol)}${eol}2 4${eol}${entries.slice(2).join(eol)}`
    : `0 6${eol}${entries.join(eol)}`;
  raw += `xref${eol}${options.section ?? section}${eol}trailer${eol}<< /Size ${options.size ?? 6} /Root ${options.root ?? "1 0 R"} ${options.trailerExtra ?? ""} >>${eol}`;
  raw += `startxref${eol}${options.startxref ?? xrefOffset}${eol}%%EOF${eol}`;
  if (options.suffix) raw += options.suffix;
  return Buffer.from(raw, "latin1");
}

function reject(input, pattern = /cross-reference table/) {
  assert.throws(() => parseArtifact("xref-table.pdf", input), pattern);
}

test("single classic xref table preserves verified page and text evidence", () => {
  const result = parseArtifact("xref-table.pdf", pdf());
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
});

test("contiguous split subsections and CRLF remain supported", () => {
  for (const eol of ["\n", "\r\n"]) {
    const result = parseArtifact("xref-table.pdf", pdf({ eol, subsections: true }));
    assert.equal(result.sourceSegments[0].locator.page, 1);
  }
});

test("physical startxref and direct object offsets must match", () => {
  reject(pdf({ startxref: 9 }), /startxref/);
  reject(pdf({ overrideEntry: { 4: [1, 0, "n"] } }), /offset/);
  reject(pdf({ overrideEntry: { 4: [0, 0, "f"] } }), /free entry/);
  reject(pdf({ overrideEntry: { 4: [1, 1, "n"] } }), /generation/);
});

test("trailer must have bounded Size and proven direct Root Catalog", () => {
  reject(pdf({ size: 5000 }), /Size/);
  reject(pdf({ root: "5 0 R" }), /Root/);
  reject(pdf({ root: "1 1 R" }), /Root/);
  reject(pdf({ trailerExtra: "/Info 4 0 R" }), /trailer/);
  reject(pdf({ trailerExtra: "/Prev 1" }), /incremental/);
  reject(pdf({ trailerExtra: "/XRefStm 1" }), /incremental/);
});

test("missing, overlapping, and malformed subsection entries fail closed", () => {
  reject(pdf({ section: "0 1\n0000000000 65535 f " }), /missing|entries/);
  reject(pdf({ section: "0 6\n0000000000 65535 f " }), /entries/);
  reject(pdf({ section: "1 5\n0000000000 65535 f " }), /entries/);
  reject(pdf({ section: "0 1\n0000000000 65535 f \n0 5\n0000000000 65535 f " }), /entries/);
  reject(pdf({ section: "0 6\n0000000000 65535 x " }), /entries|entry/);
});

test("incremental revisions and duplicate tables fail closed", () => {
  reject(pdf({ suffix: "startxref\n5\n%%EOF\n" }), /incremental/);
  reject(pdf({ suffix: "xref\n0 1\n0000000000 65535 f \n" }), /incremental/);
  reject(pdf({ suffix: "%%EOF\n" }), /incremental/);
});

test("unindexed objects, free object zero corruption and unsupported generations fail closed", () => {
  reject(pdf({ overrideEntry: { 0: [0, 0, "f"] } }), /object zero/);
  reject(pdf({ overrideEntry: { 5: [1, 0, "n"] } }), /offset/);
  reject(pdf({ overrideEntry: { 2: [0, 0, "f"] } }), /free entry/);
});

test("classic tables cannot silently mix with xref streams or compressed object streams", () => {
  const input = pdf();
  const mixed = Buffer.from(input.toString("latin1").replace("<< /Type /Catalog", "<< /Type /XRef"), "latin1");
  reject(mixed, /hybrid/);
  const compressed = Buffer.from(input.toString("latin1").replace("<< /Type /Catalog", "<< /Type /ObjStm"), "latin1");
  reject(compressed, /object stream/);
});

test("PDFs with no xref declaration retain legacy demo compatibility", () => {
  const raw = `%PDF-1.4\n1 0 obj ${catalog} endobj\n2 0 obj ${pages} endobj\n3 0 obj ${page} endobj\n4 0 obj << >> stream\n${content}\nendstream endobj\n%%EOF`;
  assert.equal(parseArtifact("legacy.pdf", Buffer.from(raw, "latin1")).sourceSegments[0].locator.page, 1);
});

test("a valid xref table never invents page evidence without a provable page tree", () => {
  assert.throws(
    () => parseArtifact("no-page-tree.pdf", pdf({ catalog: "<< /Type /Catalog >>" })),
    /catalog has no Pages reference/,
  );
});
