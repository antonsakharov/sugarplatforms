/** Strict, bounded fixed-width ToUnicode codespace parser; no glyph inference. */
export type PdfCodespace = Readonly<{
  codeBytes: 1 | 2;
  contains: (code: number) => boolean;
  containsRange: (first: number, last: number) => boolean;
}>;

const MAX_RANGES = 16;

export function parsePdfCodespaces(source: string): PdfCodespace | null {
  const blocks = [...source.matchAll(/(\d+)\s+begincodespacerange\s*([\s\S]*?)\s*endcodespacerange\b/g)];
  if (blocks.length !== 1 || (source.match(/\bbegincodespacerange\b/g) ?? []).length !== 1) return null;
  const count = Number(blocks[0][1]);
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_RANGES) return null;
  const ranges: Array<{ first: number; last: number }> = [];
  let codeBytes: 1 | 2 | null = null;
  let cursor = 0;
  const entry = /\s*<([0-9a-fA-F]{2}|[0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{2}|[0-9a-fA-F]{4})>/gy;
  for (let index = 0; index < count; index += 1) {
    entry.lastIndex = cursor;
    const match = entry.exec(blocks[0][2]);
    if (!match || match[1].length !== match[2].length) return null;
    const width = (match[1].length / 2) as 1 | 2;
    if (codeBytes !== null && width !== codeBytes) return null;
    codeBytes = width;
    const first = parseInt(match[1], 16);
    const last = parseInt(match[2], 16);
    if (first > last || ranges.some((range) => first <= range.last && last >= range.first)) return null;
    ranges.push({ first, last });
    cursor = entry.lastIndex;
  }
  if (blocks[0][2].slice(cursor).trim() !== "" || codeBytes === null) return null;
  return {
    codeBytes,
    contains: (code) => ranges.some((range) => code >= range.first && code <= range.last),
    containsRange: (first, last) => ranges.some((range) => first >= range.first && last <= range.last),
  };
}
