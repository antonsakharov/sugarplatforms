import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { undoTiffPredictor2 } from "../lib/pdf-tiff-predictor.ts";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const parms = (columns) => `/Filter /FlateDecode /DecodeParms << /Predictor 2 /Colors 1 /BitsPerComponent 8 /Columns ${columns} >>`;
const stream = (bytes, dictionary) => `<< /Length ${bytes.length} ${dictionary} >> stream\n${bytes.toString("latin1")}\nendstream`;

// Fixture encoder is independent of the decoder under test.
function tiffEncode(rows) {
  return Buffer.concat(rows.map((row) => Buffer.from(row.map((byte, index) =>
    (byte - (index ? row[index - 1] : 0) + 256) & 255))));
}
function pdfPage(encoded, dictionary) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj ${stream(encoded, dictionary)} endobj\n%%EOF`, "latin1");
}
function pdfFont(encoded, dictionary) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${stream(encoded, dictionary)} endobj\n6 0 obj << >> stream\nBT /F1 12 Tf <80> Tj ET\nendstream endobj\n%%EOF`, "latin1");
}

test("TIFF Predictor 2 reverses byte differences and resets at every row", () => {
  const rows = [Buffer.from([255, 0, 1, 128]), Buffer.from([1, 255, 0, 2])];
  const encoded = tiffEncode(rows);
  assert.deepEqual(undoTiffPredictor2(encoded, 4, 8), Buffer.concat(rows));
  assert.equal(decodePdfStream(stream(deflateSync(encoded), parms(4)), 128), Buffer.concat(rows).toString("latin1"));
});

test("TIFF Predictor 2 rejects incomplete rows, invalid dimensions, and byte-budget overflow", () => {
  assert.equal(undoTiffPredictor2(Buffer.from([1, 2, 3]), 2, 10), null);
  assert.equal(undoTiffPredictor2(Buffer.from([1, 2, 3]), 3, 2), null);
  for (const width of [0, -1, 4097, 1.5, NaN]) assert.equal(undoTiffPredictor2(Buffer.alloc(0), width, 100), null);
  assert.equal(decodePdfStream(stream(deflateSync(Buffer.from([1, 2, 3])), parms(2)), 100), null);
});

test("TIFF Predictor 2 decoded PDF content retains proven physical-page evidence", () => {
  const content = Buffer.from("BT (architecture entity identifier authority) Tj ET", "latin1");
  const parsed = parseArtifact("tiff-page.pdf", pdfPage(deflateSync(tiffEncode([content])), parms(content.length)));
  assert.match(parsed.sourceSegments[0].content, /entity identifier authority/);
  assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(parsed.sourceSegments[0].locator.page, 1);
});

test("TIFF Predictor 2 selected-font CMap retains verified glyph evidence", () => {
  const cmap = Buffer.from("1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar", "latin1");
  const parsed = parseArtifact("tiff-cmap.pdf", pdfFont(deflateSync(tiffEncode([cmap])), parms(cmap.length)));
  assert.equal(parsed.sourceSegments[0].content, "A");
  assert.equal(parsed.sourceSegments[0].locator.page, 1);
});

test("TIFF Predictor 2 rejects unsafe parameters and unsupported filter chains", () => {
  const encoded = deflateSync(tiffEncode([Buffer.from("ABC")]));
  const rejected = [
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /Colors 2 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /BitsPerComponent 4 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /Columns 0 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /Columns 4097 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /Columns 3 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 2 /Columns 3 /EarlyChange 1 >>",
    "/Filter [/ASCIIHexDecode /FlateDecode] /DecodeParms << /Predictor 2 /Columns 3 >>",
    "/Filter /LZWDecode /DecodeParms << /Predictor 2 /Columns 3 >>",
    "/Filter /FlateDecode /DP << /Predictor 2 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms [<< /Predictor 2 /Columns 3 >>]",
  ];
  for (const declaration of rejected) assert.equal(decodePdfStream(stream(encoded, declaration), 100), null, declaration);
});

test("TIFF Predictor 2 rejects oversized inflated streams before reconstruction", () => {
  const encoded = deflateSync(Buffer.alloc(1024, 1));
  assert.equal(decodePdfStream(stream(encoded, parms(16)), 64), null);
});
