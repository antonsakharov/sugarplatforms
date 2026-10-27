import { parsePdfCodespaces } from "./pdf-codespaces.ts";
/**
 * Bounded, fail-closed PDF ToUnicode CMap reader.
 * Supports disjoint one- and two-byte codespace ranges, bfchar, and bfrange.
 * Mixed widths are accepted only when the first byte unambiguously determines
 * character width. CMap inheritance and unsupported operators fail closed.
 */
export const MAX_PDF_CMAP_BYTES = 64 * 1024;
const MAX_GLYPHS = 1024;
const MAX_UNICODE_UNITS_PER_GLYPH = 64;

export type PdfUnicodeCMap = Readonly<{
  codeBytes: 1 | 2 | "mixed";
  widthForFirstByte: (byte: number) => 1 | 2 | null;
  glyphs: ReadonlyMap<number, string>;
}>;

function utf16be(hex: string): string | null {
  if (hex.length === 0 || hex.length % 4 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const value = new TextDecoder("utf-16be", { fatal: true }).decode(Buffer.from(hex, "hex"));
    if (!value || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u.test(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function parseToUnicodeCMap(source: string): PdfUnicodeCMap | null {
  if (Buffer.byteLength(source, "latin1") > MAX_PDF_CMAP_BYTES ||
      /\b(?:begincidchar|begincidrange|beginnotdefchar|beginnotdefrange|usecmap)\b/i.test(source)) return null;

  const codespaces = parsePdfCodespaces(source);
  if (!codespaces) return null;
  const { codeBytes, contains, containsRange, widthForFirstByte } = codespaces;

  const chars = [...source.matchAll(/(\d+)\s+beginbfchar\s*([\s\S]*?)\s*endbfchar\b/g)];
  const rangeBlocks = [...source.matchAll(/(\d+)\s+beginbfrange\s*([\s\S]*?)\s*endbfrange\b/g)];
  if (chars.length !== (source.match(/\bbeginbfchar\b/g) ?? []).length ||
      rangeBlocks.length !== (source.match(/\bbeginbfrange\b/g) ?? []).length ||
      chars.length + rangeBlocks.length === 0) return null;

  const result = new Map<number, string>();
  const add = (code: number, width: 1 | 2, hex: string): boolean => {
    const value = utf16be(hex);
    if (!contains(code, width) || value === null || value.length > MAX_UNICODE_UNITS_PER_GLYPH ||
        result.has(code) || result.size >= MAX_GLYPHS) return false;
    result.set(code, value);
    return true;
  };
  const sourceHex = codeBytes === "mixed" ? "(?:[0-9a-fA-F]{4}|[0-9a-fA-F]{2})" : `[0-9a-fA-F]{${codeBytes * 2}}`;
  const pair = new RegExp(`\\s*<(${sourceHex})>\\s*<([0-9a-fA-F]+)>`, "gy");
  for (const block of chars) {
    const expected = Number(block[1]);
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > MAX_GLYPHS) return null;
    let offset = 0;
    for (let index = 0; index < expected; index += 1) {
      pair.lastIndex = offset;
      const match = pair.exec(block[2]);
      if (!match || !add(parseInt(match[1], 16), (match[1].length / 2) as 1 | 2, match[2])) return null;
      offset = pair.lastIndex;
    }
    if (block[2].slice(offset).trim() !== "") return null;
  }

  for (const block of rangeBlocks) {
    const expected = Number(block[1]);
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > MAX_GLYPHS) return null;
    // Scalar bfrange destinations expand only within BMP non-surrogate values.
    // Array destinations may be longer, valid UTF-16BE strings.
    const entry = new RegExp(`\\s*<(${sourceHex})>\\s*<(${sourceHex})>\\s*(<([0-9a-fA-F]+)>|\\[\\s*((?:<\\s*[0-9a-fA-F]+\\s*>\\s*)+)\\])`, "gy");
    let offset = 0;
    for (let index = 0; index < expected; index += 1) {
      entry.lastIndex = offset;
      const match = entry.exec(block[2]);
      if (!match) return null;
      offset = entry.lastIndex;
      const start = parseInt(match[1], 16);
      const end = parseInt(match[2], 16);
      const width = (match[1].length / 2) as 1 | 2;
      if (match[1].length !== match[2].length || end < start || !containsRange(start, end, width) ||
          result.size + end - start + 1 > MAX_GLYPHS) return null;
      if (match[4] !== undefined) {
        if (match[4].length !== 4) return null;
        const base = parseInt(match[4], 16);
        if (base + end - start > 0xffff) return null;
        for (let code = start; code <= end; code += 1) {
          const unit = base + code - start;
          if ((unit >= 0xd800 && unit <= 0xdfff) ||
              !add(code, width, unit.toString(16).padStart(4, "0"))) return null;
        }
      } else {
        const values = [...match[5].matchAll(/<\s*([0-9a-fA-F]+)\s*>/g)].map((item) => item[1]);
        if (values.length !== end - start + 1) return null;
        for (let code = start; code <= end; code += 1) {
          if (!add(code, width, values[code - start])) return null;
        }
      }
    }
    if (block[2].slice(offset).trim() !== "") return null;
  }
  return { codeBytes, widthForFirstByte, glyphs: result };
}

/** Backwards-compatible single-byte adapter; rejects two-byte codespaces. */
export function parseSingleByteToUnicodeCMap(source: string): ReadonlyMap<number, string> | null {
  const parsed = parseToUnicodeCMap(source);
  return parsed?.codeBytes === 1 ? parsed.glyphs : null;
}
