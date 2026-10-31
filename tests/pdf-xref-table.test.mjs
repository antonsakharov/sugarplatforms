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
    ...(options.infoBody === undefined ? [] : [[5, options.infoBody]]),
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


const idPair = "/ID [<00112233445566778899AABBCCDDEEFF> <FFEEDDCCBBAA99887766554433221100>]";

test("bounded ID metadata does not alter verified page evidence", () => {
  for (const eol of ["\n", "\r\n"]) {
    const result = parseArtifact("xref-with-id.pdf", pdf({ eol, trailerExtra: idPair }));
    assert.equal(result.sourceSegments.length, 1);
    assert.equal(result.sourceSegments[0].locator.page, 1);
    assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
    assert.doesNotMatch(result.sourceSegments[0].content, /0011223344/);
  }
});

test("Info metadata is a live generation-zero direct dictionary, not extracted evidence", () => {
  const infoBody = "<< /Title (Internal design draft) /Producer (Sugar Diagnostic) >>";
  for (const extra of [
    "/Info 5 0 R " + idPair,
    idPair + " /Info 5 0 R",
    "/Info 5 0 R",
  ]) {
    const result = parseArtifact("xref-with-info.pdf", pdf({ infoBody, trailerExtra: extra }));
    assert.equal(result.sourceSegments[0].locator.page, 1);
    assert.doesNotMatch(result.sourceSegments[0].content, /Internal design draft|Sugar Diagnostic/);
  }
});

test("Info must not point to free, missing, catalog, or content-stream objects", () => {
  reject(pdf({ trailerExtra: "/Info 5 0 R" }), /Info trailer/);
  reject(pdf({ trailerExtra: "/Info 1 0 R" }), /Info trailer/);
  reject(pdf({ trailerExtra: "/Info 4 0 R" }), /Info trailer/);
  reject(pdf({ infoBody: "<< /Title (metadata) >>", trailerExtra: "/Info 6 0 R" }), /Info trailer/);
  reject(pdf({ infoBody: "<< /Type /Page >>", trailerExtra: "/Info 5 0 R" }), /Info trailer/);
  reject(pdf({ infoBody: "<< /Title (metadata) >>", trailerExtra: "/Info 5 1 R" }), /Info trailer/);
});

test("malformed, duplicated, oversized and non-hex ID values fail closed", () => {
  for (const extra of [
    "/ID [<ABCD> <ABCD>]",
    "/ID [<00112233445566778899AABBCCDDEEF> <00112233445566778899AABBCCDDEEFF>]",
    "/ID [<00112233445566778899AABBCCDDEEFG> <00112233445566778899AABBCCDDEEFF>]",
    "/ID [<" + "A".repeat(130) + "> <" + "B".repeat(130) + ">]",
    "/ID [<00112233445566778899AABBCCDDEEFF>]",
    idPair + " " + idPair,
    idPair + " /ID [<00112233445566778899AABBCCDDEEFF> <00112233445566778899AABBCCDDEEFF>]",
  ]) reject(pdf({ trailerExtra: extra }), /trailer/);
});

test("duplicate and unsupported trailer keys never bypass the strict parser", () => {
  for (const extra of [
    "/Info 5 0 R /Info 5 0 R",
    "/Size 6",
    "/Root 1 0 R",
    "/Custom 123",
    "/Info 5 0 R /Metadata 4 0 R",
    "/ID []",
  ]) reject(pdf({ infoBody: "<< /Title (metadata) >>", trailerExtra: extra }), /trailer/);
});

test("Info and ID compatibility never enables incremental, hybrid or encrypted PDFs", () => {
  const infoBody = "<< /Title (metadata) >>";
  for (const trailerExtra of [
    "/Info 5 0 R " + idPair + " /Prev 12",
    "/Info 5 0 R " + idPair + " /XRefStm 10",
    "/Info 5 0 R " + idPair + " /Encrypt 4 0 R",
  ]) reject(pdf({ infoBody, trailerExtra }), /incremental|encrypted/);
  reject(pdf({ infoBody, trailerExtra: "/Info 5 0 R " + idPair, suffix: "startxref\n5\n%%EOF\n" }), /incremental/);
});

function rewriteTrailer(input, rewrite) {
  const original = input.toString("latin1");
  const result = rewrite(original);
  assert.notEqual(result, original, "test must rewrite the trailer, not object bytes");
  assert.equal(result.slice(0, original.indexOf("xref\n")), original.slice(0, original.indexOf("xref\n")));
  return Buffer.from(result, "latin1");
}

test("PDF whitespace and bounded comments between trailer tokens preserve page evidence", () => {
  const input = pdf({ infoBody: "<< /Title (not architecture evidence) >>", trailerExtra: idPair + " /Info 5 0 R" });
  const modified = rewriteTrailer(input, (raw) => raw.replace(
    `trailer\n<< /Size 6 /Root 1 0 R ${idPair} /Info 5 0 R >>\n`,
    `trailer\t% optional trailer comment with >> /Prev 9\r\n` +
    `\f<<\0/Size\t% count\n6\r\n/Root\t1\t0\tR\n` +
    `/ID [<00112233445566778899AABBCCDDEEFF> % two IDs\r\n` +
    `<FFEEDDCCBBAA99887766554433221100>]\n/Info 5 0 R >> % harmless trailer tail\r\n`,
  ));
  const result = parseArtifact("comments.pdf", modified);
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical Customer ID/);
  assert.doesNotMatch(result.sourceSegments[0].content, /not architecture evidence|00112233|Prev/);
});

test("startxref accepts bounded PDF whitespace/comments without changing physical offsets", () => {
  const modified = rewriteTrailer(pdf(), (raw) => raw.replace(
    /(startxref)\n(\d+)\n%%EOF\n$/,
    (_whole, marker, offset) => `${marker}\t% note: startxref and %%EOF are just comment text\r\n\f${offset}\t% offset is physical\r\n%%EOF\n`,
  ));
  assert.equal(parseArtifact("comments.pdf", modified).sourceSegments[0].locator.page, 1);
});

test("comment text containing dictionary delimiters cannot terminate trailer early", () => {
  const modified = rewriteTrailer(pdf(), (raw) => raw.replace(
    "/Root 1 0 R  >>", "/Root 1 0 R % >> << /Info 5 0 R\n >>",
  ));
  assert.equal(parseArtifact("comments.pdf", modified).sourceSegments[0].locator.page, 1);
});

test("comment splitting a key or hexadecimal ID never repairs invalid syntax", () => {
  const keySplit = rewriteTrailer(pdf(), (raw) => raw.replace("/Size 6", "/Si% interrupted key\nze 6"));
  reject(keySplit, /trailer/);
  const idSplit = rewriteTrailer(pdf({ trailerExtra: idPair }), (raw) => raw.replace(
    "00112233445566778899AABBCCDDEEFF", "00112233% not valid inside a hex string\n445566778899AABBCCDDEEFF",
  ));
  reject(idSplit, /trailer/);
});

test("comments cannot conceal duplicate, unknown, revision or encryption fields", () => {
  const inputs = [
    ["/Size 6", "/Size 6 % comment\n/Size 6"],
    ["/Root 1 0 R", "/Root 1 0 R % comment\n/Root 1 0 R"],
    ["/Size 6", "/Size 6 % comment\n/Custom 1"],
    ["/Size 6", "/Size 6 % comment\n/Prev 5"],
    ["/Size 6", "/Size 6 % comment\n/XRefStm 5"],
    ["/Size 6", "/Size 6 % comment\n/Encrypt 5 0 R"],
  ];
  for (const [before, after] of inputs) {
    const modified = rewriteTrailer(pdf(), (raw) => raw.replace(before, after));
    reject(modified, /trailer|incremental|encrypted/);
  }
});

test("comments do not permit malformed startxref, extra EOF, or unbounded trailing data", () => {
  const malformed = rewriteTrailer(pdf(), (raw) => raw.replace(/startxref\n(\d+)\n/, "startxref\n% offset omitted\n"));
  reject(malformed, /startxref/);
  const extraEof = rewriteTrailer(pdf(), (raw) => raw.replace("%%EOF\n", "%%EOF\n%%EOF\n"));
  reject(extraEof, /incremental/);
  const trailingJunk = rewriteTrailer(pdf(), (raw) => raw.replace("%%EOF\n", "%%EOF\n% unexpected trailing comment\n"));
  reject(trailingJunk, /startxref|EOF/);
});

test("xref rows and physical offsets remain strict despite trailer whitespace compatibility", () => {
  const badEntry = rewriteTrailer(pdf({ overrideEntry: { 4: [1, 0, "n"] } }), (raw) => raw.replace(
    "trailer\n", "trailer\n% harmless note\n",
  ));
  reject(badEntry, /offset/);
  const badStart = rewriteTrailer(pdf({ startxref: 9 }), (raw) => raw.replace(
    "trailer\n", "trailer\n% harmless note\n",
  ));
  reject(badStart, /startxref/);
});

test("non-PDF whitespace and excessive terminal comments are rejected", () => {
  const nonPdfWhitespace = rewriteTrailer(pdf(), (raw) => raw.replace("/Size 6", "/Size\xA06"));
  reject(nonPdfWhitespace, /whitespace|trailer/);
  const hugeComment = rewriteTrailer(pdf(), (raw) => raw.replace(
    /startxref\n(\d+)\n/,
    (_whole, offset) => `startxref\n${offset}\n% ${"x".repeat(4100)}\n`,
  ));
  reject(hugeComment, /byte budget/);
});
