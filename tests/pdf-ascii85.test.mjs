import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

function object(body, filter = "/Filter /ASCII85Decode") {
  return `<< /Length ${body.length} ${filter} >> stream\n${body}\nendstream`;
}

// Independent test encoder: it uses BigInt, unlike the production decoder.
function encode85(input) {
  let result = "";
  for (let offset = 0; offset < input.length; offset += 4) {
    const group = input.subarray(offset, offset + 4);
    if (group.length === 4 && group.every((byte) => byte === 0)) { result += "z"; continue; }
    let value = 0n;
    for (let index = 0; index < 4; index += 1) value = value * 256n + BigInt(group[index] ?? 0);
    const digits = Array(5);
    for (let index = 4; index >= 0; index -= 1) {
      digits[index] = String.fromCharCode(Number(value % 85n) + 33);
      value /= 85n;
    }
    result += digits.slice(0, group.length + 1).join("");
  }
  return result + "~>";
}

function pageWithCmap(cmapEncoded, declaration) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${object(cmapEncoded, declaration)} endobj\n6 0 obj << >> stream\nBT /F1 12 Tf <80> Tj ET\nendstream endobj\n%%EOF`, "latin1");
}

const cmap = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar";

test("ASCII85Decode round-trips all byte values, z groups and partial tails", () => {
  for (let length = 0; length <= 17; length += 1) {
    const source = Buffer.from(Array.from({ length }, (_, i) => (i * 37 + 101) % 256));
    const decoded = decodePdfStream(object(encode85(source)), 128);
    assert.equal(decoded, source.toString("latin1"), `length ${length}`);
  }
  const zeros = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 65]);
  assert.match(encode85(zeros), /^zz/);
  assert.equal(decodePdfStream(object(encode85(zeros)), 64), zeros.toString("latin1"));
  assert.equal(decodePdfStream(object("  z \t z  ~> \n", "/Filter /A85"), 16), "\x00".repeat(8));
});

test("ASCII85Decode rejects missing terminator, illegal groups, and trailing bytes", () => {
  for (const invalid of [
    "", "z", "!~", "!~>", "!~>X", "!~>~>", "~>z", "v~>", "<~87cURD]j7BEbo80~>",
    "uuuuu~>", "z!z~>", "!!!!z~>", "!!!!!~X", "!!!!!~", "!!!!!~>x",
    "!!!!!~>\x0b", "!\x7f!!!~>",
  ]) assert.equal(decodePdfStream(object(invalid), 256), null, JSON.stringify(invalid));
});

test("ASCII85Decode enforces output limit for z-runs, full groups and partial groups", () => {
  assert.equal(decodePdfStream(object("zzz~>"), 8), null);
  assert.equal(decodePdfStream(object("!!!!!!!!!!~>"), 7), null);
  assert.equal(decodePdfStream(object("!!~>"), 4), "\x00");
  assert.equal(decodePdfStream(object("!!~>"), 0), null);
});

test("ASCII85Decode to FlateDecode preserves binary bytes and correct filter order", () => {
  const content = Buffer.from("BT (architecture authority and identity map) Tj ET", "latin1");
  const encoded = encode85(deflateSync(content));
  assert.equal(decodePdfStream(object(encoded, "/Filter [/ASCII85Decode /FlateDecode]"), 4096), content.toString("latin1"));
  assert.equal(decodePdfStream(object(encoded, "/Filter [/FlateDecode /ASCII85Decode]"), 4096), null);
});

test("ASCII85Decode filtered font CMaps preserve verified page evidence", () => {
  for (const [encoded, filter] of [
    [encode85(Buffer.from(cmap, "latin1")), "/Filter /ASCII85Decode"],
    [encode85(deflateSync(Buffer.from(cmap, "latin1"))), "/Filter [/A85 /FlateDecode]"],
  ]) {
    const parsed = parseArtifact("font-map.pdf", pageWithCmap(encoded, filter));
    assert.equal(parsed.sourceSegments[0].content, "A");
    assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
    assert.equal(parsed.sourceSegments[0].locator.page, 1);
  }
});

test("malformed or over-budget ASCII85 CMaps fail closed without synthetic evidence", () => {
  for (const encoded of ["uuuuu~>", "zzzz", "z".repeat(20_000) + "~>"]) {
    assert.throws(() => parseArtifact("font-map.pdf", pageWithCmap(encoded, "/Filter /ASCII85Decode")), /production PDF adapter/);
  }
});

test("ASCII85Decode page content preserves page-tree order and evidence locators", () => {
  const pageText = Buffer.from("BT (identity authority and integration topology) Tj ET", "latin1");
  for (const [encoded, filter] of [
    [encode85(pageText), "/Filter /ASCII85Decode"],
    [encode85(deflateSync(pageText)), "/Filter [/ASCII85Decode /FlateDecode]"],
  ]) {
    const pdf = Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj ${object(encoded, filter)} endobj\n%%EOF`, "latin1");
    const parsed = parseArtifact("page.pdf", pdf);
    assert.match(parsed.sourceSegments[0].content, /identity authority and integration topology/);
    assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
    assert.equal(parsed.sourceSegments[0].locator.page, 1);
  }
});

test("unsupported ASCII85Decode parameter declarations and filter aliases fail closed", () => {
  for (const filter of [
    "/Filter /ASCII85Decode /DecodeParms << /Predictor 1 >>",
    "/Filter [/ASCII85Decode /UnknownFilter]",
    "/Filter /ASCII85DecodeX",
    "/Filter /ASCII85Decode /Filter /ASCII85Decode",
  ]) assert.equal(decodePdfStream(object("!!!!!~>", filter), 128), null);
});
