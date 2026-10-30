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
  for (let id = 0; id < size; id += 1) {
    const override = options.overrideEntry?.[id];
    const entry = override ?? (id === 0 ? [0, 0, 65535]
      : compressed && id <= 3 ? [2, 9, id - 1]
      : offsets.has(id) ? [1, offsets.get(id), 0] : [0, 0, 0]);
    const [type, offset, gen] = entry;
    const bytes = Buffer.alloc(7);
    bytes.writeUInt8(type, 0);
    bytes.writeUInt32BE(offset, 1);
    bytes.writeUInt16BE(gen, 5);
    entries.push(bytes);
  }
  const decoded = Buffer.concat(entries);
  const encoded = deflateSync(decoded);
  const extras = options.headerExtra ?? "";
  const header = `<< /Type /XRef /Size ${options.size ?? size} /Root ${options.root ?? "1 0 R"} /W ${options.w ?? "[1 4 2]"} ${options.index ?? ""} /Length ${options.length ?? encoded.length} /Filter ${options.filter ?? "/FlateDecode"} ${extras} >>`;
  raw += `10 0 obj\n${header} stream\n${encoded.toString("latin1")}\nendstream\nendobj\n`;
  raw += `startxref\n${options.startxref ?? xrefOffset}\n%%EOF\n`;
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
  reject(pdf({ w: "[0 4 2]" }), /W widths/);
  reject(pdf({ index: "/Index [1 10]" }), /Index/);
  reject(pdf({ size: 5000 }), /Size/);
  reject(pdf({ root: "8 0 R" }), /Root/);
});

test("xref stream rejects unsupported filters, wrong Length and duplicate xref declaration", () => {
  reject(pdf({ filter: "/LZWDecode" }), /dictionary/);
  reject(pdf({ length: 1 }), /Length/);
  reject(pdf({ headerExtra: "/W [1 4 2]" }), /W widths/);
});

test("xref stream rejects unknown entry types and unindexed compressed objects", () => {
  reject(pdf({ overrideEntry: { 4: [3, 0, 0] } }), /entry type/);
  reject(pdf({ compressed: true, overrideEntry: { 3: [0, 0, 0] } }), /free entry/);
});

test("minimal legacy demo PDFs without xref remain supported", () => {
  const legacy = Buffer.from(`%PDF-1.5\n1 0 obj ${catalog} endobj\n2 0 obj ${pages} endobj\n3 0 obj ${page} endobj\n4 0 obj << >> stream\n${content}\nendstream endobj\n%%EOF`, "latin1");
  assert.equal(parseArtifact("legacy.pdf", legacy).sourceSegments[0].locator.page, 1);
});
