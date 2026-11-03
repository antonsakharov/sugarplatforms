import test from "node:test";
import assert from "node:assert/strict";
import { parseSingleByteToUnicodeCMap } from "../lib/pdf-to-unicode.ts";

const head = "1 begincodespacerange\n<00> <FF>\nendcodespacerange\n";

test("single-byte scalar bfrange decodes consecutive BMP characters", () => {
  const result = parseSingleByteToUnicodeCMap(head + "1 beginbfrange\n<80> <82> <0041>\nendbfrange");
  assert.deepEqual([result?.get(0x80), result?.get(0x81), result?.get(0x82)], ["A", "B", "C"]);
});

test("explicit bfrange array supports distinct UTF-16BE strings", () => {
  const result = parseSingleByteToUnicodeCMap(head + "1 beginbfrange\n<80> <81> [<0058> <0059005A>]\nendbfrange");
  assert.equal(result?.get(0x80), "X");
  assert.equal(result?.get(0x81), "YZ");
});

test("bfchar and bfrange can coexist without silently overriding a glyph", () => {
  const result = parseSingleByteToUnicodeCMap(head + "1 beginbfchar\n<41> <005A>\nendbfchar\n1 beginbfrange\n<80> <81> <0041>\nendbfrange");
  assert.equal(result?.get(0x41), "Z");
  assert.equal(result?.get(0x80), "A");
});

test("overlapping mappings fail closed", () => {
  assert.equal(parseSingleByteToUnicodeCMap(head + "1 beginbfchar\n<80> <0041>\nendbfchar\n1 beginbfrange\n<80> <81> <0042>\nendbfrange"), null);
});

test("invalid array lengths, surrogate ranges, and overflow fail closed", () => {
  for (const body of ["<80> <81> [<0041>]", "<80> <81> <D7FF>", "<80> <81> <FFFF>"]) {
    assert.equal(parseSingleByteToUnicodeCMap(head + "1 beginbfrange\n" + body + "\nendbfrange"), null);
  }
});

test("unknown multibyte and inherited CMaps fail closed", () => {
  const multibyte = "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n1 beginbfrange\n<0080> <0081> <0041>\nendbfrange";
  assert.equal(parseSingleByteToUnicodeCMap(multibyte), null);
  assert.equal(parseSingleByteToUnicodeCMap(head + "/Identity-H usecmap\n1 beginbfchar\n<80> <0041>\nendbfchar"), null);
});

test("malformed declared counts fail closed", () => {
  assert.equal(parseSingleByteToUnicodeCMap(head + "2 beginbfrange\n<80> <81> <0041>\nendbfrange"), null);
});

test("CMap size budget fails closed", () => {
  assert.equal(parseSingleByteToUnicodeCMap(head + " ".repeat(65536) + "1 beginbfchar\n<80> <0041>\nendbfchar"), null);
});

const twoByteHead = "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n";

test("fixed-width two-byte bfchar preserves big-endian character codes", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const cmap = parseToUnicodeCMap(twoByteHead + "2 beginbfchar\n<0100> <0043>\n<0101> <0052>\nendbfchar");
  assert.equal(cmap?.codeBytes, 2);
  assert.equal(cmap?.glyphs.get(0x0100), "C");
  assert.equal(cmap?.glyphs.get(0x0101), "R");
});

test("two-byte bfrange expands BMP scalar and explicit UTF-16BE arrays", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const cmap = parseToUnicodeCMap(twoByteHead + "2 beginbfrange\n<0100> <0102> <0041>\n<0200> <0201> [<0058> <0059005A>]\nendbfrange");
  assert.deepEqual([0x0100, 0x0101, 0x0102, 0x0200, 0x0201].map((code) => cmap?.glyphs.get(code)), ["A", "B", "C", "X", "YZ"]);
});

test("two-byte CMaps reject overlapping, out-of-codespace and malformed mappings", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  for (const block of [
    "2 beginbfchar\n<0100> <0041>\n<0100> <0042>\nendbfchar",
    "1 beginbfchar\n<010000> <0041>\nendbfchar",
    "1 beginbfchar\n<0100> <D800>\nendbfchar",
    "1 beginbfrange\n<0102> <0100> <0041>\nendbfrange",
    "1 beginbfrange\n<0100> <0101> [<0041>]\nendbfrange",
  ]) assert.equal(parseToUnicodeCMap(twoByteHead + block), null, block);
  assert.equal(parseToUnicodeCMap("1 begincodespacerange\n<0100> <01FF>\nendcodespacerange\n1 beginbfchar\n<0200> <0041>\nendbfchar"), null);
});

test("prefix-ambiguous mixed widths, usecmap, and three-byte mappings remain unsupported", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  assert.equal(parseToUnicodeCMap("2 begincodespacerange\n<00> <FF>\n<0000> <FFFF>\nendcodespacerange\n1 beginbfchar\n<0100> <0041>\nendbfchar"), null);
  assert.equal(parseToUnicodeCMap(twoByteHead + "/Identity-H usecmap\n1 beginbfchar\n<0100> <0041>\nendbfchar"), null);
  assert.equal(parseToUnicodeCMap("1 begincodespacerange\n<000000> <FFFFFF>\nendcodespacerange\n1 beginbfchar\n<010000> <0041>\nendbfchar"), null);
});

test("legacy single-byte API refuses two-byte CMaps", () => {
  assert.equal(parseSingleByteToUnicodeCMap(twoByteHead + "1 beginbfchar\n<0100> <0041>\nendbfchar"), null);
});

test("fixed-width CMap decoder supports literal bytes and TJ kerning arrays", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const { extractPdfText } = await import("../lib/pdf-text-operand-decoder.ts");
  const cmap = parseToUnicodeCMap(twoByteHead + "2 beginbfchar\n<0100> <0041>\n<0101> <0042>\nendbfchar");
  assert.ok(cmap);
  const fonts = new Map([["F1", cmap]]);
  assert.equal(extractPdfText("/F1 12 Tf (\\001\\000) Tj", fonts), "A");
  assert.equal(extractPdfText("/F1 12 Tf [<0100> -100 <0101>] TJ", fonts), "A B");
  assert.equal(extractPdfText("/F1 12 Tf <010001> Tj", fonts), null);
  assert.equal(extractPdfText("/F1 12 Tf <0102> Tj", fonts), null);
});

test("oversized per-glyph Unicode expansions fail closed", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const longGlyph = "0041".repeat(65);
  assert.equal(parseToUnicodeCMap(twoByteHead + `1 beginbfchar\n<0100> <${longGlyph}>\nendbfchar`), null);
});

test("text-block output is capped even with many valid glyphs", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const { extractPdfText } = await import("../lib/pdf-text-operand-decoder.ts");
  const cmap = parseToUnicodeCMap(twoByteHead + `1 beginbfchar\n<0100> <${"0041".repeat(64)}>\nendbfchar`);
  assert.ok(cmap);
  const operands = Array.from({ length: 65 }, () => `<${"0100".repeat(256)}> Tj`).join("\n");
  assert.equal(extractPdfText(`/F1 12 Tf ${operands}`, new Map([["F1", cmap]])), null);
});

const splitOneByteCodespace = "2 begincodespacerange\n<20> <7E>\n<80> <8F>\nendcodespacerange\n";
const splitTwoByteCodespace = "2 begincodespacerange\n<0100> <01FF>\n<0300> <03FF>\nendcodespacerange\n";

test("disjoint same-width codespace ranges decode explicit glyphs on both sides", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const cmap = parseToUnicodeCMap(splitOneByteCodespace +
    "2 beginbfchar\n<41> <0041>\n<80> <0042>\nendbfchar");
  assert.equal(cmap?.codeBytes, 1);
  assert.equal(cmap?.glyphs.get(0x41), "A");
  assert.equal(cmap?.glyphs.get(0x80), "B");
});

test("disjoint two-byte codespaces permit separate bfrange and bfchar mappings", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const cmap = parseToUnicodeCMap(splitTwoByteCodespace +
    "1 beginbfrange\n<0100> <0101> <0043>\nendbfrange\n" +
    "1 beginbfchar\n<0300> <0049>\nendbfchar");
  assert.deepEqual([0x0100, 0x0101, 0x0300].map((code) => cmap?.glyphs.get(code)), ["C", "D", "I"]);
});

test("codespace gaps reject mapped glyphs and ranges that cross gaps", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  assert.equal(parseToUnicodeCMap(splitOneByteCodespace +
    "1 beginbfchar\n<7F> <0041>\nendbfchar"), null);
  assert.equal(parseToUnicodeCMap(splitOneByteCodespace +
    "1 beginbfrange\n<7E> <80> <0041>\nendbfrange"), null);
  assert.equal(parseToUnicodeCMap(splitTwoByteCodespace +
    "1 beginbfrange\n<01FF> <0300> <0041>\nendbfrange"), null);
});

test("codespace ranges reject overlaps, reversed bounds, width ambiguity and malformed counts", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const malformed = [
    "2 begincodespacerange\n<20> <80>\n<80> <FF>\nendcodespacerange\n",
    "2 begincodespacerange\n<20> <80>\n<40> <50>\nendcodespacerange\n",
    "2 begincodespacerange\n<80> <20>\n<90> <FF>\nendcodespacerange\n",
    "2 begincodespacerange\n<80> <8F>\n<8000> <80FF>\nendcodespacerange\n",
    "3 begincodespacerange\n<20> <7E>\n<80> <8F>\nendcodespacerange\n",
    "2 begincodespacerange\n<20> <7E>\n<80> <8F> garbage\nendcodespacerange\n",
    "17 begincodespacerange\n" + "<00> <00>\n".repeat(17) + "endcodespacerange\n",
  ];
  for (const source of malformed) {
    assert.equal(parseToUnicodeCMap(source + "1 beginbfchar\n<41> <0041>\nendbfchar"), null, source);
  }
});

const mixedHead = "2 begincodespacerange\n<20> <7E>\n<8000> <80FF>\nendcodespacerange\n";

test("mixed-width bfchar and bfrange use declared source-code lengths", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const cmap = parseToUnicodeCMap(mixedHead +
    "1 beginbfchar\n<43> <0043>\nendbfchar\n" +
    "1 beginbfrange\n<8001> <8002> <0052>\nendbfrange");
  assert.equal(cmap?.codeBytes, "mixed");
  assert.deepEqual([0x43, 0x8001, 0x8002].map((code) => cmap?.glyphs.get(code)), ["C", "R", "S"]);
  const { extractPdfText } = await import("../lib/pdf-text-operand-decoder.ts");
  const fonts = new Map([["F1", cmap]]);
  assert.equal(extractPdfText("/F1 12 Tf <4380018002> Tj", fonts), "CRS");
  assert.equal(extractPdfText("/F1 12 Tf [<43> -120 <8001>] TJ", fonts), "C R");
  assert.equal(extractPdfText("/F1 12 Tf (C\\200\\001) Tj", fonts), "CR");
});

test("mixed-width maps fail closed on truncated, undefined and ambiguous codes", async () => {
  const { parseToUnicodeCMap } = await import("../lib/pdf-to-unicode.ts");
  const { extractPdfText } = await import("../lib/pdf-text-operand-decoder.ts");
  const cmap = parseToUnicodeCMap(mixedHead +
    "2 beginbfchar\n<43> <0043>\n<8001> <0052>\nendbfchar");
  assert.ok(cmap);
  for (const hex of ["80", "4380", "7F", "8002", "8101", "80014380"]) {
    assert.equal(extractPdfText(`/F1 12 Tf <${hex}> Tj`, new Map([["F1", cmap]])), null, hex);
  }
  for (const block of [
    "1 beginbfchar\n<8001> <0052>\nendbfchar\n1 beginbfchar\n<8001> <0053>\nendbfchar",
    "1 beginbfchar\n<0043> <0043>\nendbfchar",
    "1 beginbfrange\n<43> <8001> <0043>\nendbfrange",
    "1 beginbfrange\n<8000> <80> <0043>\nendbfrange",
  ]) assert.equal(parseToUnicodeCMap(mixedHead + block), null, block);
});

test("legacy single-byte reader refuses valid mixed-width CMaps", () => {
  assert.equal(parseSingleByteToUnicodeCMap(mixedHead + "1 beginbfchar\n<43> <0043>\nendbfchar"), null);
});
