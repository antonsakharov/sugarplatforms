/** Strict, bounded, prefix-unambiguous one-/two-byte ToUnicode codespaces. */
export type PdfCodeWidth = 1 | 2;
export type PdfCodespace = Readonly<{
  codeBytes: PdfCodeWidth | "mixed";
  contains: (code: number, width?: PdfCodeWidth) => boolean;
  containsRange: (first: number, last: number, width?: PdfCodeWidth) => boolean;
  widthForFirstByte: (byte: number) => PdfCodeWidth | null;
}>;

const MAX_RANGES = 16;

type Range = { first: number; last: number; width: PdfCodeWidth };

export function parsePdfCodespaces(source: string): PdfCodespace | null {
  const blocks = [...source.matchAll(/(\d+)\s+begincodespacerange\s*([\s\S]*?)\s*endcodespacerange\b/g)];
  if (blocks.length !== 1 || (source.match(/\bbegincodespacerange\b/g) ?? []).length !== 1) return null;
  const count = Number(blocks[0][1]);
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_RANGES) return null;
  const ranges: Range[] = [];
  let cursor = 0;
  const entry = /\s*<([0-9a-fA-F]{2}|[0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{2}|[0-9a-fA-F]{4})>/gy;
  for (let index = 0; index < count; index += 1) {
    entry.lastIndex = cursor;
    const match = entry.exec(blocks[0][2]);
    if (!match || match[1].length !== match[2].length) return null;
    const width = (match[1].length / 2) as PdfCodeWidth;
    const first = parseInt(match[1], 16);
    const last = parseInt(match[2], 16);
    if (first > last || ranges.some((range) => range.width === width && first <= range.last && last >= range.first)) return null;
    ranges.push({ first, last, width });
    cursor = entry.lastIndex;
  }
  if (blocks[0][2].slice(cursor).trim() !== "") return null;

  const one = ranges.filter((range) => range.width === 1);
  const two = ranges.filter((range) => range.width === 2);
  // PDF character codes are variable length only when their first byte is
  // sufficient to choose the width. Otherwise decoding would invent boundaries.
  if (one.some((single) => two.some((double) =>
    single.first <= (double.last >> 8) && single.last >= (double.first >> 8)))) return null;

  const codeBytes = one.length && two.length ? "mixed" : one.length ? 1 : 2;
  const contains = (code: number, width?: PdfCodeWidth) =>
    Number.isInteger(code) && ranges.some((range) =>
      (width === undefined || range.width === width) && code >= range.first && code <= range.last);
  const containsRange = (first: number, last: number, width?: PdfCodeWidth) =>
    Number.isInteger(first) && Number.isInteger(last) && first <= last && ranges.some((range) =>
      (width === undefined || range.width === width) && first >= range.first && last <= range.last);
  const widthForFirstByte = (byte: number): PdfCodeWidth | null => {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) return null;
    if (one.some((range) => byte >= range.first && byte <= range.last)) return 1;
    if (two.some((range) => byte >= (range.first >> 8) && byte <= (range.last >> 8))) return 2;
    return null;
  };
  return { codeBytes, contains, containsRange, widthForFirstByte };
}
