import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodePdfStream } from "../lib/pdf-stream-filters.ts";
import { lzwDecode } from "../lib/pdf-lzw.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const stream = (bytes, filter = "/Filter /LZWDecode") =>
  `<< /Length ${bytes.length} ${filter} >> stream\n${bytes.toString("latin1")}\nendstream`;

// Independent LZW encoder for regression fixtures. It constructs the code
// sequence using string dictionaries, unlike the decoder's prefix tables.
function encodeCodes(bytes) {
  const dict = new Map(Array.from({ length: 256 }, (_, i) => [String.fromCharCode(i), i]));
  const codes = [256];
  let next = 258;
  let word = "";
  for (const byte of bytes) {
    const candidate = word + String.fromCharCode(byte);
    if (dict.has(candidate)) { word = candidate; continue; }
    if (word) codes.push(dict.get(word));
    if (next < 4096) dict.set(candidate, next++);
    word = String.fromCharCode(byte);
  }
  if (word) codes.push(dict.get(word));
  codes.push(257);
  return codes;
}

function packCodes(codes) {
  let width = 9;
  let next = 258;
  let previous = false;
  const bits = [];
  for (const code of codes) {
    for (let shift = width - 1; shift >= 0; shift -= 1) bits.push((code >>> shift) & 1);
    if (code === 256) { width = 9; next = 258; previous = false; continue; }
    if (code === 257) continue;
    if (previous && next < 4096) {
      next += 1;
      if (width < 12 && next + 1 === 1 << width) width += 1;
    }
    previous = true;
  }
  const output = Buffer.alloc(Math.ceil(bits.length / 8));
  bits.forEach((bit, index) => { output[index >>> 3] |= bit << (7 - (index & 7)); });
  return output;
}

const encode = (bytes) => packCodes(encodeCodes(bytes));
const cmap = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n1 beginbfchar\n<80> <0041>\nendbfchar";
const page = (content, filter) => Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n4 0 obj ${stream(content, filter)} endobj\n%%EOF`, "latin1");
const fontPage = (encoded, filter) => Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Contents 6 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj\n4 0 obj << /Type /Font /ToUnicode 5 0 R >> endobj\n5 0 obj ${stream(encoded, filter)} endobj\n6 0 obj << >> stream\nBT /F1 12 Tf <80> Tj ET\nendstream endobj\n%%EOF`, "latin1");

test("PDF LZW known KwKwK sequence and empty clear/EOD stream", () => {
  assert.equal(lzwDecode(packCodes([256, 65, 66, 258, 260, 257]), 128)?.toString(), "ABABABA");
  assert.equal(decodePdfStream(stream(packCodes([256, 257])), 32), "");
  assert.equal(decodePdfStream(stream(packCodes([256, 65, 257]), "/Filter /LZW"), 32), "A");
});

test("PDF LZW binary roundtrips including 9-to-10 and 10-to-11 bit growth", () => {
  for (const size of [1, 17, 128, 500, 1800, 6000]) {
    const bytes = Buffer.from(Array.from({ length: size }, (_, i) => (i * 53 + (i >>> 3) * 7) & 255));
    const compressed = encode(bytes);
    assert.equal(decodePdfStream(stream(compressed), Math.max(8192, compressed.length)), bytes.toString("latin1"), `size ${size}`);
  }
});

test("PDF LZW handles dictionary reset and code table reuse", () => {
  const a = encode(Buffer.from("ABABABA", "latin1"));
  assert.equal(lzwDecode(a, 128)?.toString("latin1"), "ABABABA");
  const reset = packCodes([256, 65, 66, 256, 67, 68, 257]);
  assert.equal(lzwDecode(reset, 128)?.toString("latin1"), "ABCD");
});

test("PDF LZW rejects malformed code references, missing clear/EOD, trailing garbage and nonzero padding", () => {
  for (const bytes of [
    Buffer.alloc(0), packCodes([65, 257]), packCodes([256, 65]),
    packCodes([256, 258, 257]), packCodes([256, 65, 300, 257]),
    Buffer.concat([packCodes([256, 65, 257]), Buffer.from([0])]),
    Buffer.concat([packCodes([256, 65, 257]), Buffer.from([1])]),
  ]) assert.equal(lzwDecode(bytes, 128), null);
  const invalidPadding = packCodes([256, 65, 257]);
  invalidPadding[invalidPadding.length - 1] |= 1;
  assert.equal(lzwDecode(invalidPadding, 128), null);
});

test("PDF LZW rejects expansion beyond output cap and unsupported DecodeParms", () => {
  const bytes = encode(Buffer.from("AB".repeat(1000), "latin1"));
  assert.equal(lzwDecode(bytes, 1024), null);
  assert.equal(decodePdfStream(stream(bytes, "/Filter /LZWDecode /DecodeParms << /EarlyChange 0 >>"), 4096), null);
  assert.equal(decodePdfStream(stream(bytes, "/Filter /LZWDecode /DecodeParms << /EarlyChange 1 >>"), 4096), null);
  assert.equal(decodePdfStream(stream(bytes, "/Filter /LZWDecode /DP << /Predictor 1 >>"), 4096), null);
});

test("PDF LZW page streams and LZW-to-Flate chains retain physical page evidence", () => {
  const text = Buffer.from("BT (architecture identifier authority map) Tj ET", "latin1");
  for (const [bytes, filter] of [
    [encode(text), "/Filter /LZWDecode"],
    [encode(deflateSync(text)), "/Filter [/LZW /FlateDecode]"],
  ]) {
    const parsed = parseArtifact("lzw-page.pdf", page(bytes, filter));
    assert.match(parsed.sourceSegments[0].content, /architecture identifier authority map/);
    assert.equal(parsed.sourceSegments[0].locator.type, "pdf-page");
    assert.equal(parsed.sourceSegments[0].locator.page, 1);
  }
});

test("PDF LZW font CMaps retain proven physical-page evidence", () => {
  for (const [bytes, filter] of [
    [encode(Buffer.from(cmap, "latin1")), "/Filter /LZWDecode"],
    [encode(deflateSync(Buffer.from(cmap, "latin1"))), "/Filter [/LZW /Fl]"],
  ]) {
    const parsed = parseArtifact("lzw-font.pdf", fontPage(bytes, filter));
    assert.equal(parsed.sourceSegments[0].content, "A");
    assert.equal(parsed.sourceSegments[0].locator.page, 1);
  }
});

test("PDF LZW malformed CMaps fail closed without inventing evidence", () => {
  for (const bytes of [Buffer.from([0, 1]), packCodes([256, 258, 257]), encode(Buffer.from("x".repeat(100_000)))]) {
    assert.throws(() => parseArtifact("bad-font.pdf", fontPage(bytes, "/Filter /LZWDecode")), /production PDF adapter/);
  }
});
