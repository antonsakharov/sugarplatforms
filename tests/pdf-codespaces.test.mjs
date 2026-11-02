import test from "node:test";
import assert from "node:assert/strict";
import { parsePdfCodespaces } from "../lib/pdf-codespaces.ts";

const oneByte = "2 begincodespacerange\n<20> <7E>\n<80> <8F>\nendcodespacerange";
const twoByte = "2 begincodespacerange\n<0100> <01FF>\n<0300> <03FF>\nendcodespacerange";

test("disjoint one-byte ranges preserve membership and gaps", () => {
  const codespace = parsePdfCodespaces(oneByte);
  assert.equal(codespace?.codeBytes, 1);
  assert.equal(codespace?.contains(0x41), true);
  assert.equal(codespace?.contains(0x7f), false);
  assert.equal(codespace?.contains(0x80), true);
  assert.equal(codespace?.containsRange(0x7e, 0x80), false);
});

test("two-byte ranges cannot be bridged by a mapping", () => {
  const codespace = parsePdfCodespaces(twoByte);
  assert.equal(codespace?.codeBytes, 2);
  assert.equal(codespace?.containsRange(0x0100, 0x0101), true);
  assert.equal(codespace?.containsRange(0x01ff, 0x0300), false);
});

test("codespace parser rejects overlapping, prefix-ambiguous widths and count mismatches", () => {
  for (const source of [
    "2 begincodespacerange\n<20> <80>\n<80> <FF>\nendcodespacerange",
    "2 begincodespacerange\n<80> <8F>\n<8000> <80FF>\nendcodespacerange",
    "3 begincodespacerange\n<20> <7E>\n<80> <8F>\nendcodespacerange",
  ]) assert.equal(parsePdfCodespaces(source), null);
});

const mixed = "3 begincodespacerange\n<20> <7E>\n<8000> <80FF>\n<9000> <90FF>\nendcodespacerange";

test("prefix-unambiguous mixed widths select exact glyph boundaries", () => {
  const codespace = parsePdfCodespaces(mixed);
  assert.equal(codespace?.codeBytes, "mixed");
  assert.equal(codespace?.widthForFirstByte(0x41), 1);
  assert.equal(codespace?.widthForFirstByte(0x80), 2);
  assert.equal(codespace?.widthForFirstByte(0x90), 2);
  assert.equal(codespace?.widthForFirstByte(0x7f), null);
  assert.equal(codespace?.contains(0x41, 1), true);
  assert.equal(codespace?.contains(0x8001, 2), true);
  assert.equal(codespace?.contains(0x41, 2), false);
  assert.equal(codespace?.containsRange(0x80fe, 0x9001, 2), false);
});

test("mixed-width codespaces reject overlapping first-byte prefixes", () => {
  for (const cmap of [
    "2 begincodespacerange\n<80> <80>\n<8000> <80FF>\nendcodespacerange",
    "2 begincodespacerange\n<80> <81>\n<81FF> <8200>\nendcodespacerange",
    "2 begincodespacerange\n<00> <FF>\n<0000> <FFFF>\nendcodespacerange",
  ]) assert.equal(parsePdfCodespaces(cmap), null);
});
