import test from "node:test";
import assert from "node:assert/strict";
import { parseArtifact } from "../lib/artifact-parser.ts";
import { pdfPageFontMaps } from "../lib/pdf-font-resources.ts";

const cmap = (letter) => `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <${letter.charCodeAt(0).toString(16).padStart(4, "0")}>\nendbfchar`;
const pdf = ({ rootResources = "/Resources << /Font << /F1 4 0 R >> >>", pageResources = "", intermediateResources = "", rootFont = "/F1 4 0 R", fontSelection = "/F1 12 Tf", stream = "<80> Tj" } = {}) => {
  const root = rootResources.replace("/F1 4 0 R", rootFont);
  return new TextEncoder().encode(`%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [7 0 R] /Count 1 ${root} >> endobj
7 0 obj << /Type /Pages /Parent 2 0 R /Kids [3 0 R] /Count 1 ${intermediateResources} >> endobj
3 0 obj << /Type /Page /Parent 7 0 R /Contents 6 0 R ${pageResources} >> endobj
4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj
5 0 obj << /Length 90 >> stream
${cmap("A")}
endstream endobj
8 0 obj << /Type /Font /ToUnicode 9 0 R >> endobj
9 0 obj << /Length 90 >> stream
${cmap("B")}
endstream endobj
10 0 obj << /Font << /F1 8 0 R >> >> endobj
11 0 obj << /F1 4 0 R >> endobj
6 0 obj << /Length 20 >> stream
BT ${fontSelection} ${stream} ET
endstream endobj
%%EOF`);
};
const extract = (options) => parseArtifact("inherited.pdf", pdf(options));

test("PDF page inherits ToUnicode font resources from ancestor Pages node", () => {
  const result = extract();
  assert.equal(result.sourceSegments[0].content, "A");
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("PDF nested Pages resource overrides root inheritance", () => {
  const result = extract({ intermediateResources: "/Resources << /Font << /F1 8 0 R >> >>" });
  assert.equal(result.sourceSegments[0].content, "B");
});

test("PDF Page resource overrides nested and root resources", () => {
  const result = extract({ intermediateResources: "/Resources << /Font << /F1 8 0 R >> >>", pageResources: "/Resources << /Font << /F1 4 0 R >> >>" });
  assert.equal(result.sourceSegments[0].content, "A");
});

test("PDF inherited indirect Resources and Font dictionaries resolve safely", () => {
  const result = extract({ rootResources: "/Resources 10 0 R" });
  assert.equal(result.sourceSegments[0].content, "B");
});

test("PDF missing selected font rejects glyph instead of falling back to ASCII", () => {
  assert.throws(() => extract({ fontSelection: "/Unknown 12 Tf", stream: "(CRM) Tj" }), /production PDF adapter/);
});

test("PDF unsupported explicit resource declaration overrides valid ancestor and fails closed", () => {
  assert.throws(() => extract({ pageResources: "/Resources /Unsupported", stream: "(CRM) Tj" }), /production PDF adapter/);
});

test("PDF duplicate Resources declaration fails closed", () => {
  assert.throws(() => extract({ pageResources: "/Resources << /Font << /F1 4 0 R >> >> /Resources 10 0 R" }), /production PDF adapter/);
});

test("PDF missing Font reference fails closed", () => {
  assert.throws(() => extract({ pageResources: "/Resources << /Font << /F1 99 0 R >> >>" }), /production PDF adapter/);
});

test("PDF missing inherited resources never grants an unknown font", () => {
  assert.throws(() => extract({ rootResources: "", stream: "(CRM) Tj" }), /production PDF adapter/);
});

test("PDF malformed font dictionary does not silently use a partial mapping", () => {
  assert.throws(() => extract({ pageResources: "/Resources << /Font << /F1 4 0 R /Broken >> >>" }), /production PDF adapter/);
});

test("PDF font resolver never loops on cyclic Parent references", () => {
  const objects = new Map([["3 0", "<< /Type /Page /Parent 7 0 R >>"], ["7 0", "<< /Type /Pages /Parent 3 0 R >>"]]);
  assert.equal(pdfPageFontMaps("3 0", objects), null);
});

test("PDF indirect Font dictionary resolves from inherited Resources", () => {
  const result = extract({ rootResources: "/Resources << /Font 11 0 R >>" });
  assert.equal(result.sourceSegments[0].content, "A");
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("PDF explicit resource override without Font does not borrow ancestor font", () => {
  assert.throws(() => extract({ pageResources: "/Resources << /ProcSet [/PDF /Text] >>" }), /production PDF adapter/);
});

test("PDF broken indirect resource object fails closed", () => {
  assert.throws(() => extract({ pageResources: "/Resources 99 0 R" }), /production PDF adapter/);
});


test("PDF fragment fallback rejects unknown selected-font encoding", () => {
  const raw = new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Page >> endobj\nBT /F1 12 Tf (CRM) Tj ET\n%%EOF");
  assert.throws(() => parseArtifact("no-catalog-font.pdf", raw), /production PDF adapter/);
});
