import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { undoPngPredictor15 } from "../lib/pdf-png-predictor.ts";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const parms = (columns) => `/Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${columns} >>`;
const stream = (bytes, options) => `<< /Length ${bytes.length} ${options} >> stream\n${bytes.toString("latin1")}\nendstream`;

// Fixture encoder independent from the implementation under test.
function pngRow(raw, previous, filter) {
  const result = Buffer.alloc(raw.length + 1);
  result[0] = filter;
  for (let i = 0; i < raw.length; i++) {
    const left = i ? raw[i - 1] : 0;
    const up = previous?.[i] ?? 0;
    const upperLeft = i ? (previous?.[i - 1] ?? 0) : 0;
    let predicted = 0;
    if (filter === 1) predicted = left;
    if (filter === 2) predicted = up;
    if (filter === 3) predicted = Math.floor((left + up) / 2);
    if (filter === 4) {
      const p = left + up - upperLeft;
      const a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upperLeft);
      predicted = a <= b && a <= c ? left : b <= c ? up : upperLeft;
    }
    result[i + 1] = (raw[i] - predicted + 256) & 255;
  }
  return result;
}

function pdfPage(encoded, dictionary) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj ${stream(encoded, dictionary)} endobj\n%%EOF`, "latin1");
}
function pdfFont(encoded, dictionary) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${stream(encoded, dictionary)} endobj\n6 0 obj << >> stream\nBT /F1 12 Tf <80> Tj ET\nendstream endobj\n%%EOF`, "latin1");
}

test("PNG filters None, Sub, Up, Average and Paeth reconstruct exact bytes", () => {
  const rows = Array.from({length: 5}, (_, i) => Buffer.from(Array.from({length: 31}, (_, j) => (i * 47 + j * 31) & 255)));
  const encoded = Buffer.concat(rows.map((row, i) => pngRow(row, rows[i - 1], i)));
  assert.deepEqual(undoPngPredictor15(encoded, 31, 1024), Buffer.concat(rows));
  assert.equal(decodePdfStream(stream(deflateSync(encoded), parms(31)), 1024), Buffer.concat(rows).toString("latin1"));
});

test("PNG predictor rejects partial rows, unknown filters, over-budget rows and invalid dimensions", () => {
  assert.equal(undoPngPredictor15(Buffer.from([0, 65]), 2, 10), null);
  assert.equal(undoPngPredictor15(Buffer.from([5, 65]), 1, 10), null);
  assert.equal(undoPngPredictor15(Buffer.from([0, 65]), 1, 1), null);
  for (const width of [0, -1, 4097, 1.5, NaN]) assert.equal(undoPngPredictor15(Buffer.alloc(0), width, 100), null);
});

test("Flate PNG Predictor 15 preserves physical-page evidence", () => {
  const content = Buffer.from("BT (customer identifier authority architecture) Tj ET", "latin1");
  const encoded = pngRow(content, null, 1);
  const parsed = parseArtifact("predicted-page.pdf", pdfPage(deflateSync(encoded), parms(content.length)));
  assert.match(parsed.sourceSegments[0].content, /identifier authority architecture/);
  assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(parsed.sourceSegments[0].locator.page, 1);
});

test("Flate PNG Predictor 15 selected-font CMap preserves exact glyph evidence", () => {
  const cmap = Buffer.from("1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar", "latin1");
  const parsed = parseArtifact("predicted-cmap.pdf", pdfFont(deflateSync(pngRow(cmap, null, 4)), parms(cmap.length)));
  assert.equal(parsed.sourceSegments[0].content, "A");
  assert.equal(parsed.sourceSegments[0].locator.page, 1);
});

test("unsupported DecodeParms, aliases, multiple declarations, and filter chains fail closed", () => {
  const payload = deflateSync(pngRow(Buffer.from("ABC"), null, 0));
  const rejected = [
    "/Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /BitsPerComponent 4 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /Columns 0 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /Columns 3 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /Columns 3 /EarlyChange 1 >>",
    "/Filter /FlateDecode /DP << /Predictor 15 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms [<< /Predictor 15 /Columns 3 >>]",
    "/Filter [/ASCIIHexDecode /FlateDecode] /DecodeParms << /Predictor 15 /Columns 3 >>",
    "/Filter /LZWDecode /DecodeParms << /Predictor 15 /Columns 3 >>",
    "/Filter /FlateDecode /DecodeParms << /Predictor 15 /Columns 3 >> /DecodeParms << /Predictor 15 >>",
  ];
  for (const declaration of rejected) assert.equal(decodePdfStream(stream(payload, declaration), 4096), null, declaration);
});

test("invalid PNG row tag, truncated data and inflated-size violations fail closed", () => {
  for (const encoded of [Buffer.from([9, 65, 66]), Buffer.from([0, 65]), Buffer.alloc(1024, 0)]) {
    assert.equal(decodePdfStream(stream(deflateSync(encoded), parms(2)), 64), null);
  }
});
