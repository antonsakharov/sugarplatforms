import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { expandPdfObjectStreams } from "../lib/pdf-object-streams.ts";
import { parseArtifact } from "../lib/artifact-parser.ts";

const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
const pages = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
const page = "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>";

function packed(entries) {
  let payload = "";
  const offsets = [];
  for (const [id, value] of entries) {
    offsets.push(`${id} ${payload.length}`);
    payload += `${value}\n`;
  }
  const index = `${offsets.join(" ")} `;
  return { decoded: index + payload, first: index.length };
}

function objectStream(entries = [[1, catalog], [2, pages], [3, page]], overrides = {}) {
  const { decoded, first } = packed(entries);
  const compressed = deflateSync(Buffer.from(overrides.decoded ?? decoded, "latin1"));
  const length = overrides.length ?? compressed.length;
  const n = overrides.n ?? entries.length;
  const firstValue = overrides.first ?? first;
  return `<< /Type /ObjStm /N ${n} /First ${firstValue} /Length ${length} /Filter /FlateDecode >> stream\n${compressed.toString("latin1")}\nendstream`;
}

function pdfWithStream(body = objectStream()) {
  const content = "BT (CRM owns canonical customer IDs) Tj ET";
  return Buffer.from(`%PDF-1.5\n9 0 obj ${body}\nendobj\n4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj\n%%EOF`, "latin1");
}

test("Flate object streams restore the page tree and preserve verified page evidence", () => {
  const result = parseArtifact("object-stream.pdf", pdfWithStream());
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.type, "pdf-page");
  assert.equal(result.sourceSegments[0].locator.page, 1);
  assert.match(result.sourceSegments[0].content, /canonical customer IDs/);
});

test("direct dictionary references can point to compressed page objects", () => {
  const map = new Map([["9 0", objectStream([[2, pages], [3, page]])], ["1 0", catalog]]);
  const result = expandPdfObjectStreams(map);
  assert.equal(result.get("1 0"), catalog);
  assert.equal(result.get("3 0"), page);
  assert.equal(map.size, 2);
});

test("duplicate direct and compressed IDs fail closed", () => {
  assert.throws(() => expandPdfObjectStreams(new Map([["9 0", objectStream()], ["2 0", pages]])), /duplicate/);
});

test("malformed object-stream N, First, and declared byte Length fail closed", () => {
  for (const overrides of [{ n: 129 }, { n: 2 }, { first: 1000000 }, { length: 1 }]) {
    assert.throws(() => expandPdfObjectStreams(new Map([["9 0", objectStream(undefined, overrides)]])), /object stream/);
  }
});

test("malformed object index, repeated offsets and repeated IDs fail closed", () => {
  const cases = [
    { decoded: "1 0 2 0 " + `${catalog}\n${pages}\n` },
    { decoded: "1 0 1 39 " + `${catalog}\n${pages}\n` },
    { decoded: "1 0 2 x " + `${catalog}\n${pages}\n` },
  ];
  for (const entry of cases) {
    const body = objectStream([[1, catalog], [2, pages]], { ...entry, first: 8 });
    assert.throws(() => expandPdfObjectStreams(new Map([["9 0", body]])), /object stream/);
  }
});

test("embedded streams, encryption dictionaries, and nested object streams are rejected", () => {
  for (const value of ["<< /Type /Page /Contents stream >>", "<< /Encrypt 8 0 R >>", "<< /Type /ObjStm >>"]) {
    assert.throws(() => expandPdfObjectStreams(new Map([["9 0", objectStream([[1, value]])]])), /unsupported embedded object/);
  }
});

test("unfiltered object streams and unsupported DecodeParms are rejected", () => {
  const good = objectStream();
  assert.throws(() => expandPdfObjectStreams(new Map([["9 0", good.replace("/Filter /FlateDecode", "")]])), /unsupported object stream dictionary/);
  assert.throws(() => expandPdfObjectStreams(new Map([["9 0", good.replace("/Filter /FlateDecode", "/Filter /FlateDecode /DecodeParms << /Predictor 2 >>")]])), /unsupported object stream dictionary/);
});

test("object streams without a provable Catalog/Pages tree cannot invent fragment evidence", () => {
  assert.throws(() => parseArtifact("no-tree.pdf", pdfWithStream(objectStream([[2, pages], [3, page]]))), /provable page tree/);
});

test("oversized object-stream expansion fails before producing source segments", () => {
  const body = objectStream([[1, "<< /A " + "x".repeat(1024 * 1024 + 10) + " >>"]]);
  assert.throws(() => parseArtifact("bomb.pdf", pdfWithStream(body)), /object stream/);
});

test("compressed page order follows Kids, not packed object order", () => {
  const compressedPages = objectStream([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [5 0 R 3 0 R] /Count 2 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [5, "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>"],
  ]);
  const input = Buffer.from(`%PDF-1.5\n9 0 obj ${compressedPages}\nendobj\n4 0 obj << >> stream\nBT (Second physical page) Tj ET\nendstream endobj\n6 0 obj << >> stream\nBT (First physical page) Tj ET\nendstream endobj\n%%EOF`, "latin1");
  const result = parseArtifact("ordered-objstm.pdf", input);
  assert.deepEqual(result.sourceSegments.map((segment) => segment.locator.page), [1, 2]);
  assert.match(result.sourceSegments[0].content, /First physical page/);
  assert.match(result.sourceSegments[1].content, /Second physical page/);
});

test("compressed objects reject nonzero initial offset and excessive stream count", () => {
  const { decoded } = packed([[1, catalog]]);
  const bad = objectStream([[1, catalog]], { decoded: `1 1 ${decoded.slice(4)}`, first: 4 });
  assert.throws(() => expandPdfObjectStreams(new Map([["9 0", bad]])), /object stream/);
  const many = new Map(Array.from({ length: 17 }, (_, i) => [`${i + 20} 0`, objectStream([[i + 100, catalog]])]));
  assert.throws(() => expandPdfObjectStreams(many), /too many object streams/);
});
