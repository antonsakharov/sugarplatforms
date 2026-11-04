import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { parseArtifact } from "../lib/artifact-parser.ts";

const bytes = (value) => new TextEncoder().encode(value);

test("Markdown parsing preserves heading-based line ranges", () => {
  const result = parseArtifact("architecture.md", bytes("# Context\nCRM owns customer IDs.\n\n## Integration\nCRM publishes customer.updated."));
  assert.equal(result.parser, "markdown");
  assert.equal(result.sourceSegments.length, 2);
  assert.deepEqual(result.sourceSegments.map((segment) => segment.locator.value), ["lines 1-3", "lines 4-5"]);
  assert.equal(result.sourceSegments[0].title, "Context");
});

test("JSON parsing emits stable JSON Pointer locators", () => {
  const result = parseArtifact("inventory.json", bytes(JSON.stringify({ systems: [{ name: "CRM" }], owner: "Platform" })));
  assert.equal(result.parser, "json");
  assert.deepEqual(result.sourceSegments.map((segment) => segment.locator.value), ["/systems", "/owner"]);
  assert.match(result.sourceSegments[0].contentSha256, /^[a-f0-9]{64}$/);
});

test("OpenAPI JSON and YAML are classified without model inference", () => {
  const json = parseArtifact("openapi.json", bytes('{"openapi":"3.1.0","paths":{"/customers":{}}}'));
  const yaml = parseArtifact("openapi.yaml", bytes("openapi: 3.1.0\ninfo:\n  title: Customer API\npaths:\n  /customers:\n    get: {}\n"));
  assert.equal(json.parser, "openapi-json");
  assert.equal(yaml.parser, "openapi-yaml");
  assert.ok(yaml.sourceSegments.some((segment) => segment.title === "paths"));
});

test("YAML top-level sections preserve line coordinates", () => {
  const result = parseArtifact("systems.yaml", bytes("systems:\n  - name: CRM\nowners:\n  CRM: platform\n"));
  assert.equal(result.parser, "yaml");
  assert.equal(result.sourceSegments[0].locator.startLine, 1);
  assert.equal(result.sourceSegments[1].locator.startLine, 3);
});

test("CSV parser handles quoted commas and preserves row ranges", () => {
  const result = parseArtifact("systems.csv", bytes('system,owner,notes\nCRM,Sales,"primary, customer system"\nBilling,Finance,ledger\n'));
  assert.equal(result.parser, "csv");
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.value, "rows 2-3");
  assert.match(result.sourceSegments[0].content, /"primary, customer system"/);
});

test("SQL DDL parser segments CREATE statements with line provenance", () => {
  const result = parseArtifact("schema.sql", bytes("CREATE TABLE customer (\n id uuid primary key\n);\n\nCREATE VIEW active_customer AS\nSELECT * FROM customer;\n"));
  assert.equal(result.parser, "sql-ddl");
  assert.equal(result.sourceSegments.length, 2);
  assert.equal(result.sourceSegments[0].title, "customer");
  assert.equal(result.sourceSegments[1].locator.startLine, 5);
});

test("PDF direct-text adapter preserves honest fragment provenance without inventing page coordinates", () => {
  const value = "%PDF-1.7\n1 0 obj << /Type /Page >> endobj\nstream\nBT (CRM owns customer ID) Tj ET\nendstream\n%%EOF";
  const result = parseArtifact("architecture.pdf", bytes(value));
  assert.equal(result.parser, "pdf-text");
  assert.equal(result.sourceSegments[0].locator.type, "pdf-text-fragment");
  assert.equal(result.sourceSegments[0].locator.value, "direct-text fragment 1");
  assert.equal(result.sourceSegments[0].locator.page, undefined);
  assert.match(result.sourceSegments[0].content, /CRM owns customer ID/);
  assert.ok(result.warnings.some((warning) => /fragment locators are used instead of synthetic page numbers/.test(warning)));
});

test("PDF parser fails closed for unsupported compressed/scanned content", () => {
  assert.throws(() => parseArtifact("architecture.pdf", bytes("%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n%%EOF")), /production PDF adapter/);
});

test("unsupported formats fail closed instead of pretending to parse", () => {
  assert.throws(() => parseArtifact("architecture.docx", bytes("not supported")), /No deterministic parser/);
});

test("PDF parser preserves exact page provenance when Page objects reference uncompressed Contents streams", () => {
  const value = `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 5 0 R >> endobj
4 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R >> endobj
5 0 obj << /Length 34 >> stream
BT (CRM owns customer ID) Tj ET
endstream endobj
6 0 obj << /Length 37 >> stream
BT (Billing consumes customer ID) Tj ET
endstream endobj
%%EOF`;
  const result = parseArtifact("architecture.pdf", bytes(value));
  assert.equal(result.sourceSegments.length, 2);
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.equal(result.sourceSegments[1].locator.page, 2);
  assert.match(result.sourceSegments[1].content, /Billing consumes customer ID/);
  assert.ok(result.warnings.some((warning) => /page provenance was preserved/.test(warning)));
});

test("PDF parser preserves exact page provenance for FlateDecode content streams", () => {
  const compressed = deflateSync(Buffer.from("BT (CRM publishes canonical customer ID) Tj ET", "latin1"));
  const prefix = Buffer.from(`%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Length ${compressed.length} /Filter /FlateDecode >> stream
`, "latin1");
  const suffix = Buffer.from("\nendstream endobj\n%%EOF", "latin1");
  const value = Buffer.concat([prefix, compressed, suffix]);
  const result = parseArtifact("compressed-architecture.pdf", value);
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical customer ID/);
  assert.ok(result.warnings.some((warning) => /FlateDecode streams are supported/.test(warning)));
});

test("PDF parser does not decode unsupported filters as if provenance were complete", () => {
  const value = `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Filter /LZWDecode >> stream
not-decodable
endstream endobj
%%EOF`;
  assert.throws(() => parseArtifact("unsupported-filter.pdf", bytes(value)), /production PDF adapter/);
});

test("PDF parser preserves page provenance through ASCIIHexDecode and FlateDecode filter chains", () => {
  const compressed = deflateSync(Buffer.from("BT (CRM authority survives chained filters) Tj ET", "latin1"));
  const encoded = Buffer.from(`${compressed.toString("hex")}>`, "latin1");
  const prefix = Buffer.from(`%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj
4 0 obj << /Length ${encoded.length} /Filter [/ASCIIHexDecode /FlateDecode] >> stream
`, "latin1");
  const suffix = Buffer.from("\nendstream endobj\n%%EOF", "latin1");
  const result = parseArtifact("chained-filter.pdf", Buffer.concat([prefix, encoded, suffix]));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /authority survives chained filters/);
});

test("PDF ASCIIHexDecode accepts odd final nibble per PDF semantics", () => {
  const operator = Buffer.concat([Buffer.from("BT (ID map) Tj ET", "latin1"), Buffer.from([0])]);
  const encoded = Buffer.from(`${operator.toString("hex").slice(0, -1)}>`, "latin1");
  const value = Buffer.concat([
    Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Pages /Kids [2 0 R] /Count 1 >> endobj\n9 0 obj << /Type /Catalog /Pages 1 0 R >> endobj\n2 0 obj << /Type /Page /Parent 1 0 R /Contents 3 0 R >> endobj\n3 0 obj << /Filter /ASCIIHexDecode >> stream\n`, "latin1"),
    encoded,
    Buffer.from("\nendstream endobj\n%%EOF", "latin1"),
  ]);
  const result = parseArtifact("asciihex.pdf", value);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /ID map/);
});


function pagePdf(content, filter = "") {
  const stream = Buffer.isBuffer(content) ? content : Buffer.from(content, "latin1");
  return Buffer.concat([
    Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Pages /Kids [2 0 R] /Count 1 >> endobj\n9 0 obj << /Type /Catalog /Pages 1 0 R >> endobj\n2 0 obj << /Type /Page /Parent 1 0 R /Contents 3 0 R >> endobj\n3 0 obj << /Length ${stream.length} ${filter} >> stream\n`, "latin1"),
    stream,
    Buffer.from("\nendstream endobj\n%%EOF", "latin1"),
  ]);
}

test("PDF literal strings decode octal escapes, nested parentheses, and line continuation", () => {
  const value = pagePdf("BT (CRM\\040owns\\040(customer)\\\n IDs) Tj ET");
  const result = parseArtifact("escaped.pdf", value);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.equal(result.sourceSegments[0].content, "CRM owns (customer) IDs");
});

test("PDF UTF-16BE BOM hex string has source-addressable Unicode text", () => {
  const utf16be = Buffer.from([0xfe, 0xff, 0x00, 0x43, 0x00, 0x52, 0x00, 0x4d, 0x00, 0x20, 0x00, 0x49, 0x00, 0x44]);
  const result = parseArtifact("unicode.pdf", pagePdf(`BT <${utf16be.toString("hex")}> Tj ET`));
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].content, "CRM ID");
});

test("PDF TJ arrays decode mixed ASCII literal and hex operands", () => {
  const result = parseArtifact("tj.pdf", pagePdf("BT [(CRM) -90 <206f776e73> 80 ( IDs)] TJ ET"));
  assert.equal(result.sourceSegments[0].content, "CRM owns IDs");
});

test("PDF high-bit glyphs without a known font mapping fail closed", () => {
  assert.throws(() => parseArtifact("unmapped.pdf", pagePdf("BT <e9> Tj ET")), /production PDF adapter/);
});

test("PDF malformed hex operands fail closed", () => {
  assert.throws(() => parseArtifact("bad-hex.pdf", pagePdf("BT <FF0Z> Tj ET")), /production PDF adapter/);
});

test("PDF decompression is bounded against oversized Flate streams", () => {
  const large = deflateSync(Buffer.from(`BT (${"A".repeat(4 * 1024 * 1024 + 100)}) Tj ET`, "latin1"));
  assert.throws(() => parseArtifact("oversized.pdf", pagePdf(large, "/Filter /FlateDecode")), /production PDF adapter/);
});

function orderedTreePdf({ rootKids = "[4 0 R 3 0 R]", rootCount = 2, page3Parent = "2 0 R", page4Parent = "2 0 R", extra = "" } = {}) {
  return `%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids ${rootKids} /Count ${rootCount} >> endobj
3 0 obj << /Type /Page /Parent ${page3Parent} /Contents 5 0 R >> endobj
4 0 obj << /Type /Page /Parent ${page4Parent} /Contents 6 0 R >> endobj
5 0 obj << /Length 30 >> stream
BT (CRM on physical page) Tj ET
endstream endobj
6 0 obj << /Length 31 >> stream
BT (Billing on first page) Tj ET
endstream endobj
${extra}
%%EOF`;
}

test("PDF page numbers follow Catalog/Pages/Kids order, not object declaration order", () => {
  const result = parseArtifact("reordered.pdf", bytes(orderedTreePdf()));
  assert.equal(result.sourceSegments.length, 2);
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /Billing on first page/);
  assert.equal(result.sourceSegments[1].locator.page, 2);
  assert.match(result.sourceSegments[1].content, /CRM on physical page/);
});

test("PDF nested Pages nodes preserve physical page order", () => {
  const value = orderedTreePdf({
    rootKids: "[7 0 R]",
    rootCount: 2,
    page3Parent: "7 0 R",
    page4Parent: "7 0 R",
    extra: "7 0 obj << /Type /Pages /Parent 2 0 R /Kids [4 0 R 3 0 R] /Count 2 >> endobj",
  });
  const result = parseArtifact("nested.pdf", bytes(value));
  assert.match(result.sourceSegments[0].content, /Billing on first page/);
  assert.equal(result.sourceSegments[1].locator.page, 2);
});

test("PDF page tree rejects inconsistent declared Count", () => {
  assert.throws(() => parseArtifact("bad-count.pdf", bytes(orderedTreePdf({ rootCount: 3 }))), /Count does not match/);
});

test("PDF page tree rejects repeated Kids and missing Parent linkage", () => {
  assert.throws(() => parseArtifact("duplicate-page.pdf", bytes(orderedTreePdf({ rootKids: "[3 0 R 3 0 R]" }))), /repeated reference/);
  assert.throws(() => parseArtifact("wrong-parent.pdf", bytes(orderedTreePdf({ page4Parent: "8 0 R" }))), /inconsistent Parent/);
});

test("PDF page tree rejects missing objects, cycles, and malformed Kids", () => {
  assert.throws(() => parseArtifact("missing-page.pdf", bytes(orderedTreePdf({ rootKids: "[4 0 R 99 0 R]" }))), /missing object/);
  assert.throws(() => parseArtifact("cyclic.pdf", bytes(orderedTreePdf({ rootKids: "[2 0 R]", rootCount: 1 }))), /cycle or repeated/);
  assert.throws(() => parseArtifact("malformed.pdf", bytes(orderedTreePdf({ rootKids: "[4 0 R invalid 3 0 R]" }))), /malformed Kids/);
});

test("PDF duplicate object IDs fail closed instead of selecting an arbitrary revision", () => {
  const value = orderedTreePdf({ extra: "3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R >> endobj" });
  assert.throws(() => parseArtifact("duplicate-object.pdf", bytes(value)), /repeated object IDs/);
});

test("PDF without Catalog never claims a physical page number", () => {
  const value = orderedTreePdf().replace("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "");
  const result = parseArtifact("no-catalog.pdf", bytes(value));
  assert.ok(result.sourceSegments.every((segment) => segment.locator.type === "pdf-text-fragment"));
});

test("PDF page-tree policy rejects declared page counts beyond the 150-page MVP limit", () => {
  assert.throws(() => parseArtifact("too-many-pages.pdf", bytes(orderedTreePdf({ rootCount: 151 }))), /150-page MVP limit/);
});

function cmapPdf(textOperand, { cmap = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n3 beginbfchar\n<80> <0043>\n<81> <0052>\n<41> <005A>\nendbfchar`, fontSelection = "/F1 12 Tf", resourceReference = false } = {}) {
  const pageResources = resourceReference ? "/Resources 7 0 R" : "/Resources << /Font << /F1 4 0 R >> >>";
  return bytes(`%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R ${pageResources} /Contents 6 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /ToUnicode 5 0 R >> endobj
5 0 obj << /Length ${cmap.length} >> stream
${cmap}
endstream endobj
6 0 obj << /Length 99 >> stream
BT ${fontSelection} ${textOperand} Tj ET
endstream endobj
7 0 obj << /Font << /F1 4 0 R >> >> endobj
%%EOF`);
}

test("PDF ToUnicode bfchar maps selected single-byte font glyphs with exact page evidence", () => {
  const result = parseArtifact("font-mapped.pdf", cmapPdf("<8081>"));
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].content, "CR");
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("PDF ToUnicode mapping takes precedence over ASCII byte identity", () => {
  const result = parseArtifact("font-mapped-ascii.pdf", cmapPdf("<41>"));
  assert.equal(result.sourceSegments[0].content, "Z");
});

test("PDF ToUnicode supports directly referenced page Resources dictionary", () => {
  const result = parseArtifact("resource-ref.pdf", cmapPdf("<8081>", { resourceReference: true }));
  assert.equal(result.sourceSegments[0].content, "CR");
});

test("PDF ToUnicode rejects unmapped glyphs instead of inventing evidence", () => {
  assert.throws(() => parseArtifact("partial-cmap.pdf", cmapPdf("<8082>")), /production PDF adapter/);
});

test("PDF ToUnicode accepts bounded bfrange mappings but rejects malformed declared counts", () => {
  const range = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfrange\n<80> <81> <0043>\nendbfrange";
  const mismatch = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n2 beginbfchar\n<80> <0043>\nendbfchar";
  assert.equal(parseArtifact("range.pdf", cmapPdf("<8081>", { cmap: range })).sourceSegments[0].content, "CD");
  assert.throws(() => parseArtifact("count.pdf", cmapPdf("<80>", { cmap: mismatch })), /production PDF adapter/);
});

test("PDF high-bit text without a selected font never borrows a page CMap", () => {
  assert.throws(() => parseArtifact("no-tf.pdf", cmapPdf("<80>", { fontSelection: "" })), /production PDF adapter/);
});


test("PDF invalid CMap cannot fall back to guessed ASCII from raw objects", () => {
  const bad = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfrange\n<41> <41> <D800>\nendbfrange";
  assert.throws(() => parseArtifact("bad-ascii-cmap.pdf", cmapPdf("<41>", { cmap: bad })), /production PDF adapter/);
});

test("PDF ToUnicode bfrange scalar maps consecutive BMP glyphs with verified page", () => {
  const cmap = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfrange\n<80> <82> <0041>\nendbfrange`;
  const result = parseArtifact("cmap-range.pdf", cmapPdf("<808182>", { cmap }));
  assert.equal(result.sourceSegments[0].content, "ABC");
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("PDF ToUnicode bfrange array maps explicit UTF-16BE glyphs without guessing", () => {
  const cmap = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfrange\n<80> <81> [<0058> <0059>]\nendbfrange`;
  assert.equal(parseArtifact("cmap-array.pdf", cmapPdf("<8081>", { cmap })).sourceSegments[0].content, "XY");
});

test("PDF ToUnicode supports disjoint bfchar and bfrange blocks", () => {
  const cmap = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<41> <005A>\nendbfchar\n1 beginbfrange\n<80> <81> <0041>\nendbfrange`;
  assert.equal(parseArtifact("mixed-cmap.pdf", cmapPdf("<418081>", { cmap })).sourceSegments[0].content, "ZAB");
});

test("PDF ToUnicode rejects overlapping mappings and invalid range arrays", () => {
  const base = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n`;
  const overlap = `${base}1 beginbfchar\n<80> <0041>\nendbfchar\n1 beginbfrange\n<80> <81> <0042>\nendbfrange`;
  const shortArray = `${base}1 beginbfrange\n<80> <81> [<0041>]\nendbfrange`;
  for (const cmap of [overlap, shortArray]) {
    assert.throws(() => parseArtifact("invalid-range.pdf", cmapPdf("<80>", { cmap })), /production PDF adapter/);
  }
});

test("PDF ToUnicode rejects surrogate, overflow, and malformed declared ranges", () => {
  const base = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n`;
  const bad = [
    `1 beginbfrange\n<80> <81> <D7FF>\nendbfrange`,
    `1 beginbfrange\n<80> <81> <FFFF>\nendbfrange`,
    `2 beginbfrange\n<80> <81> <0041>\nendbfrange`,
    `1 beginbfrange\n<80> <81> <0041> extra\nendbfrange`,
    `1 beginbfrange\n<81> <80> <0041>\nendbfrange`,
  ];
  for (const block of bad) {
    assert.throws(() => parseArtifact("malformed-range.pdf", cmapPdf("<80>", { cmap: base + block })), /production PDF adapter/);
  }
});

test("PDF ToUnicode rejects missing glyphs in a valid partial range", () => {
  const cmap = `1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfrange\n<80> <81> <0041>\nendbfrange`;
  assert.throws(() => parseArtifact("partial-range.pdf", cmapPdf("<8082>", { cmap })), /production PDF adapter/);
});

test("PDF two-byte ToUnicode glyphs extract with proven physical page", () => {
  const cmap = `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n1 beginbfrange\n<0100> <0102> <0043>\nendbfrange`;
  const result = parseArtifact("two-byte-font.pdf", cmapPdf("<010001010102>", { cmap }));
  assert.equal(result.sourceSegments[0].content, "CDE");
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
});

test("PDF two-byte ToUnicode works with literal glyph bytes and TJ arrays", () => {
  const cmap = `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n2 beginbfchar\n<0100> <0041>\n<0101> <0042>\nendbfchar`;
  const result = parseArtifact("two-byte-literal.pdf", cmapPdf("<0100>", { cmap }));
  assert.equal(result.sourceSegments[0].content, "A");
  assert.throws(() => parseArtifact("odd-two-byte.pdf", cmapPdf("<010001>", { cmap })), /production PDF adapter/);
  assert.throws(() => parseArtifact("unmapped-two-byte.pdf", cmapPdf("<0102>", { cmap })), /production PDF adapter/);
});

test("PDF multi-range same-width ToUnicode maps produce page-backed architecture evidence", () => {
  const cmap = `2 begincodespacerange\n<40> <5F>\n<80> <8F>\nendcodespacerange\n2 beginbfchar\n<43> <0043>\n<80> <0052>\nendbfchar`;
  const result = parseArtifact("disjoint-codespaces.pdf", cmapPdf("<4380>", { cmap }));
  assert.equal(result.sourceSegments[0].content, "CR");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.throws(() => parseArtifact("gap.pdf", cmapPdf("<7F>", { cmap })), /production PDF adapter/);
});


test("PDF mixed-width ToUnicode maps retain verified page evidence", () => {
  const cmap = `2 begincodespacerange\n<20> <7E>\n<8000> <80FF>\nendcodespacerange\n2 beginbfchar\n<43> <0043>\n<8001> <0052>\nendbfchar`;
  const result = parseArtifact("mixed-width-page.pdf", cmapPdf("<438001>", { cmap }));
  assert.equal(result.sourceSegments[0].content, "CR");
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.throws(() => parseArtifact("mixed-width-truncated.pdf", cmapPdf("<4380>", { cmap })), /production PDF adapter/);
  assert.throws(() => parseArtifact("mixed-width-unknown.pdf", cmapPdf("<438002>", { cmap })), /production PDF adapter/);
});
