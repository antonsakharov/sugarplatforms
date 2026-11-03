import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const object = (bytes, filter = "/Filter /RunLengthDecode") =>
  `<< /Length ${bytes.length} ${filter} >> stream\n${bytes.toString("latin1")}\nendstream`;

// Independent test encoder deliberately emits literal runs only.
function literalRunLength(bytes) {
  const output = [];
  for (let offset = 0; offset < bytes.length; offset += 128) {
    const slice = bytes.subarray(offset, offset + 128);
    output.push(slice.length - 1, ...slice);
  }
  output.push(128);
  return Buffer.from(output);
}

const cmap = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar";

function pdfWithCmap(encoded, filter) {
  return Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${object(encoded, filter)} endobj\n6 0 obj << >> stream\nBT /F1 12 Tf <80> Tj ET\nendstream endobj\n%%EOF`, "latin1");
}

test("RunLengthDecode round-trips binary values, empty streams, and 128-byte blocks", () => {
  for (const size of [0, 1, 2, 127, 128, 129, 257, 512]) {
    const bytes = Buffer.from(Array.from({ length: size }, (_, i) => (i * 73 + 149) % 256));
    const encoded = literalRunLength(bytes);
    assert.equal(decodePdfStream(object(encoded), Math.max(size, encoded.length)), bytes.toString("latin1"));
  }
});

test("RunLengthDecode handles repeated runs, boundary lengths, aliases and whitespace after EOD", () => {
  const runs = Buffer.from([129, 65, 255, 66, 0, 67, 128, 10, 32]);
  assert.equal(decodePdfStream(object(runs, "/Filter /RL"), 130), null);
  assert.equal(decodePdfStream(object(runs), 131), "A".repeat(128) + "BBC");
  assert.equal(decodePdfStream(object(Buffer.from([128])), 1), "");
});

test("RunLengthDecode rejects truncated literal/repeat runs, missing EOD and trailing data", () => {
  for (const bytes of [
    [0], [1, 65], [129], [255], [0, 65], [128, 1], [128, 128],
    [0, 65, 128, 88], [129, 65, 128, 11],
  ]) {
    assert.equal(decodePdfStream(object(Buffer.from(bytes)), 256), null, JSON.stringify(bytes));
  }
});

test("RunLengthDecode caps literal and repeat expansion before allocating output", () => {
  assert.equal(decodePdfStream(object(Buffer.from([129, 65, 128])), 127), null);
  assert.equal(decodePdfStream(object(Buffer.from([1, 65, 66, 128])), 3), null);
  assert.equal(decodePdfStream(object(Buffer.from([255, 65, 128])), 3), "AA");
  assert.equal(decodePdfStream(object(Buffer.from([255, 65, 128])), 1), null);
});

test("RunLengthDecode -> FlateDecode chain preserves byte-faithful page content", () => {
  const text = Buffer.from("BT (canonical identity ownership map) Tj ET", "latin1");
  const encoded = literalRunLength(deflateSync(text));
  assert.equal(decodePdfStream(object(encoded, "/Filter [/RunLengthDecode /FlateDecode]"), 4096), text.toString("latin1"));
  assert.equal(decodePdfStream(object(encoded, "/Filter [/FlateDecode /RunLengthDecode]"), 4096), null);
  const pdf = Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj ${object(encoded, "/Filter [/RL /Fl]")} endobj\n%%EOF`, "latin1");
  const parsed = parseArtifact("runlength-page.pdf", pdf);
  assert.match(parsed.sourceSegments[0].content, /canonical identity ownership map/);
  assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(parsed.sourceSegments[0].locator.page, 1);
});

test("RunLengthDecode ToUnicode CMaps retain verified physical-page provenance", () => {
  for (const [encoded, filter] of [
    [literalRunLength(Buffer.from(cmap, "latin1")), "/Filter /RunLengthDecode"],
    [literalRunLength(deflateSync(Buffer.from(cmap, "latin1"))), "/Filter [/RL /FlateDecode]"],
  ]) {
    const parsed = parseArtifact("runlength-font.pdf", pdfWithCmap(encoded, filter));
    assert.equal(parsed.sourceSegments[0].content, "A");
    assert.equal(parsed.sourceSegments[0].locator.page, 1);
  }
});

test("RunLengthDecode rejects malformed or over-budget CMaps without synthetic evidence", () => {
  for (const bytes of [Buffer.from([0, 65]), Buffer.from([129, 65, 128]), Buffer.from([128, 99])]) {
    assert.throws(() => parseArtifact("runlength-bad.pdf", pdfWithCmap(bytes, "/Filter /RL")), /production PDF adapter/);
  }
  const oversized = Buffer.from(Array.from({ length: 600 }, () => [129, 65]).flat().concat([128]));
  assert.throws(() => parseArtifact("runlength-bomb.pdf", pdfWithCmap(oversized, "/Filter /RL")), /production PDF adapter/);
});

test("RunLengthDecode rejects DecodeParms, unknown filters, and malformed filter declarations", () => {
  const encoded = literalRunLength(Buffer.from("A"));
  for (const filter of [
    "/Filter /RL /DecodeParms << /Predictor 1 >>",
    "/Filter [/RL /LZWDecode]",
    "/Filter /RL /Filter /RL",
  ]) assert.equal(decodePdfStream(object(encoded, filter), 1024), null);
});
