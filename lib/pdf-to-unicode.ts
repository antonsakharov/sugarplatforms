/**
 * Bounded, fail-closed single-byte PDF ToUnicode CMap reader.
 * Only one-byte codespaces, bfchar and bfrange (BMP scalar or explicit
 * UTF-16BE array) are supported. Unsupported mappings never guess glyphs.
 */
export const MAX_PDF_CMAP_BYTES = 64 * 1024;
const MAX_GLYPHS = 256;

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

function consumePairs(body: string, expected: number, add: (code: number, hex: string) => boolean): boolean {
  const pattern = /\s*<([0-9a-fA-F]{2})>\s*<([0-9a-fA-F]+)>/gy;
  let offset = 0;
  for (let index = 0; index < expected; index += 1) {
    pattern.lastIndex = offset;
    const match = pattern.exec(body);
    if (!match || !add(parseInt(match[1], 16), match[2])) return false;
    offset = pattern.lastIndex;
  }
  return body.slice(offset).trim() === "";
}

export function parseSingleByteToUnicodeCMap(source: string): ReadonlyMap<number, string> | null {
  if (Buffer.byteLength(source, "latin1") > MAX_PDF_CMAP_BYTES ||
      /\b(?:begincidchar|begincidrange|beginnotdefchar|beginnotdefrange|usecmap)\b/i.test(source)) return null;
  const spaces = [...source.matchAll(/(\d+)\s+begincodespacerange\s*([\s\S]*?)\s*endcodespacerange\b/g)];
  if (spaces.length !== 1 || Number(spaces[0][1]) !== 1 ||
      (source.match(/\bbegincodespacerange\b/g) ?? []).length !== 1) return null;
  const space = /^\s*<([0-9a-fA-F]{2})>\s*<([0-9a-fA-F]{2})>\s*$/.exec(spaces[0][2]);
  if (!space) return null;
  const first = parseInt(space[1], 16);
  const last = parseInt(space[2], 16);
  if (first > last) return null;

  const chars = [...source.matchAll(/(\d+)\s+beginbfchar\s*([\s\S]*?)\s*endbfchar\b/g)];
  const ranges = [...source.matchAll(/(\d+)\s+beginbfrange\s*([\s\S]*?)\s*endbfrange\b/g)];
  if (chars.length !== (source.match(/\bbeginbfchar\b/g) ?? []).length ||
      ranges.length !== (source.match(/\bbeginbfrange\b/g) ?? []).length ||
      chars.length + ranges.length === 0) return null;

  const result = new Map<number, string>();
  const add = (code: number, hex: string): boolean => {
    const value = utf16be(hex);
    if (code < first || code > last || value === null || result.has(code) || result.size >= MAX_GLYPHS) return false;
    result.set(code, value);
    return true;
  };
  for (const block of chars) {
    const expected = Number(block[1]);
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > MAX_GLYPHS ||
        !consumePairs(block[2], expected, add)) return null;
  }

  for (const block of ranges) {
    const expected = Number(block[1]);
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > MAX_GLYPHS) return null;
    // Each entry: <start> <end> <UTF-16BE BMP start> OR
    // <start> <end> [<UTF-16BE> ...]. Arrays must have exact range length.
    const entry = /\s*<([0-9a-fA-F]{2})>\s*<([0-9a-fA-F]{2})>\s*(<([0-9a-fA-F]+)>|\[\s*((?:<\s*[0-9a-fA-F]+\s*>\s*)+)\])/gy;
    let offset = 0;
    for (let index = 0; index < expected; index += 1) {
      entry.lastIndex = offset;
      const match = entry.exec(block[2]);
      if (!match) return null;
      offset = entry.lastIndex;
      const start = parseInt(match[1], 16);
      const end = parseInt(match[2], 16);
      if (end < start || start < first || end > last || result.size + end - start + 1 > MAX_GLYPHS) return null;
      if (match[4] !== undefined) {
        // Conservative scalar expansion: only BMP non-surrogate units.
        if (match[4].length !== 4) return null;
        const base = parseInt(match[4], 16);
        if (base + end - start > 0xffff) return null;
        for (let code = start; code <= end; code += 1) {
          const unit = base + code - start;
          if (unit >= 0xd800 && unit <= 0xdfff ||
              !add(code, unit.toString(16).padStart(4, "0"))) return null;
        }
      } else {
        const values = [...match[5].matchAll(/<\s*([0-9a-fA-F]+)\s*>/g)].map((item) => item[1]);
        if (values.length !== end - start + 1) return null;
        for (let code = start; code <= end; code += 1) {
          if (!add(code, values[code - start])) return null;
        }
      }
    }
    if (block[2].slice(offset).trim() !== "") return null;
  }
  return result;
}
