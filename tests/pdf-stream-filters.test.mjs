import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const obj = (body, filter = "") => `<< /Length ${body.length} ${filter} >> stream\n${body}\nendstream`;
const cmap = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar";

function pageWithCmap(encoded, declaration) {
  const source = `%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${obj(encoded, declaration)} endobj\n6 0 obj ${obj("BT /F1 12 Tf <80> Tj ET")} endobj\n%%EOF`;
  return Buffer.from(source, "latin1");
}

test("ASCIIHex and Flate filters decode binary bytes without Windows-1252 corruption", () => {
  const payload = Buffer.from("BT (canonical identity authority) Tj ET", "latin1");
  const compressed = deflateSync(payload);
  const hex = `${compressed.toString("hex")}>`;
  assert.equal(decodePdfStream(obj(hex, "/Filter [/ASCIIHexDecode /FlateDecode]"), 1024), payload.toString("latin1"));
  assert.equal(decodePdfStream(obj(compressed.toString("latin1"), "/Filter /FlateDecode"), 1024), payload.toString("latin1"));
});

test("filtered ToUnicode CMaps preserve verified PDF page evidence", () => {
  const compressed = deflateSync(Buffer.from(cmap, "latin1"));
  const chained = `${compressed.toString("hex")}>`;
  for (const [encoded, filter] of [[compressed.toString("latin1"), "/Filter /FlateDecode"], [chained, "/Filter [/ASCIIHexDecode /FlateDecode]"]]) {
    const result = parseArtifact("cmap.pdf", pageWithCmap(encoded, filter));
    assert.equal(result.sourceSegments[0].content, "A");
    assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
    assert.equal(result.sourceSegments[0].locator.page, 1);
  }
});

test("CMap decompression bomb fails closed at 64 KiB", () => {
  const compressed = deflateSync(Buffer.from(cmap + " ".repeat(65536), "latin1"));
  assert.throws(() => parseArtifact("bomb.pdf", pageWithCmap(compressed.toString("latin1"), "/Filter /FlateDecode")), /production PDF adapter/);
});

test("predictor/DecodeParms and unknown CMap filters are never silently ignored", () => {
  for (const declaration of ["/Filter /FlateDecode /DecodeParms << /Predictor 12 >>", "/Filter /LZWDecode", "/Filter [/FlateDecode /LZWDecode]", "/Filter /FlateDecode /Filter /FlateDecode"]) {
    assert.throws(() => parseArtifact("bad-cmap.pdf", pageWithCmap(cmap, declaration)), /production PDF adapter/, declaration);
  }
});

test("ASCIIHex malformed EOD, trailing garbage, and unknown bytes fail closed", () => {
  for (const value of ["4142", "41>BAD", "4Z>", "41>>"]) {
    assert.equal(decodePdfStream(obj(value, "/Filter /ASCIIHexDecode"), 100), null, value);
  }
  assert.equal(decodePdfStream(obj("4> \n", "/Filter /AHx"), 100), "@");
});

test("strict decoded-size bounds reject compressed content over budget", () => {
  const compressed = deflateSync(Buffer.from("A".repeat(4096), "latin1"));
  assert.equal(decodePdfStream(obj(compressed.toString("latin1"), "/Filter /FlateDecode"), 128), null);
});

test("PDF parser handles compressed content containing non-ASCII binary bytes", () => {
  // Find a deterministic payload whose zlib output includes bytes 0x80-0x9f.
  let payload, compressed;
  for (let i = 0; i < 100; i += 1) {
    payload = `BT (CRM authority ${"x".repeat(i)} and ID map) Tj ET`;
    compressed = deflateSync(Buffer.from(payload, "latin1"));
    if (compressed.some((byte) => byte >= 0x80 && byte <= 0x9f)) break;
  }
  assert.ok(compressed.some((byte) => byte >= 0x80 && byte <= 0x9f));
  const pdf = Buffer.concat([
    Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj << /Filter /FlateDecode >> stream\n`, "latin1"),
    compressed,
    Buffer.from("\nendstream endobj\n%%EOF", "latin1"),
  ]);
  const result = parseArtifact("binary.pdf", pdf);
  assert.match(result.sourceSegments[0].content, /CRM authority/);
  assert.equal(result.sourceSegments[0].locator.page, 1);
});
