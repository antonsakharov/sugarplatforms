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

test("codespace parser rejects overlapping, mixed-width and count mismatches", () => {
  for (const source of [
    "2 begincodespacerange\n<20> <80>\n<80> <FF>\nendcodespacerange",
    "2 begincodespacerange\n<20> <7E>\n<0100> <01FF>\nendcodespacerange",
    "3 begincodespacerange\n<20> <7E>\n<80> <8F>\nendcodespacerange",
  ]) assert.equal(parsePdfCodespaces(source), null);
});
