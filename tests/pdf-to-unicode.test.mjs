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
