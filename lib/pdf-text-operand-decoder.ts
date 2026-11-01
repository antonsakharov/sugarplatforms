import type { PdfUnicodeCMap } from "./pdf-to-unicode.ts";
// The bounded adapter deliberately refuses glyph bytes whose Unicode meaning cannot
// be established without a PDF font/CMap decoder. Never turn unknown glyphs into facts.
export const MAX_PDF_DECODED_STREAM_BYTES = 4 * 1024 * 1024;
const MAX_PDF_TEXT_TOKENS = 100_000;
const MAX_PDF_EXTRACTED_TEXT_CHARS = 1024 * 1024;

type PdfToken = { kind: "string" | "word" | "bracket"; raw: string };

function pdfTextTokens(source: string): PdfToken[] | null {
  const tokens: PdfToken[] = [];
  let index = 0;
  const delimiter = (value: string) => /[\s()[\]<>/%]/.test(value);
  while (index < source.length) {
    if (tokens.length >= MAX_PDF_TEXT_TOKENS) return null;
    const char = source[index];
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === "%") { while (index < source.length && !/[\r\n]/.test(source[index])) index += 1; continue; }
    if (char === "(") {
      const start = index;
      let depth = 0;
      while (index < source.length) {
        const current = source[index++];
        if (current === "\\") { if (index < source.length) index += 1; continue; }
        if (current === "(") depth += 1;
        else if (current === ")" && --depth === 0) break;
      }
      if (depth !== 0) return null;
      tokens.push({ kind: "string", raw: source.slice(start, index) });
      continue;
    }
    if (char === "<" && source[index + 1] !== "<") {
      const start = index++;
      while (index < source.length && source[index] !== ">") index += 1;
      if (index >= source.length) return null;
      index += 1;
      tokens.push({ kind: "string", raw: source.slice(start, index) });
      continue;
    }
    if (char === "[" || char === "]") {
      tokens.push({ kind: "bracket", raw: char }); index += 1; continue;
    }
    if (char === "/") { // PDF names are not text operators.
      const start = index++;
      while (index < source.length && !delimiter(source[index])) index += 1;
      tokens.push({ kind: "word", raw: source.slice(start, index) });
      continue;
    }
    if (char === "<" || char === ">" || char === ")") { index += 1; continue; }
    const start = index++;
    while (index < source.length && !delimiter(source[index])) index += 1;
    tokens.push({ kind: "word", raw: source.slice(start, index) });
  }
  return tokens;
}

function decodePdfString(token: string, cmap?: PdfUnicodeCMap | null): string | null {
  const bytes: number[] = [];
  if (token.startsWith("<")) {
    const hex = token.slice(1, -1).replace(/[\x00\x09\x0a\x0c\x0d\x20]/g, "");
    if (!/^[0-9a-fA-F]*$/.test(hex)) return null;
    const padded = hex.length % 2 ? hex + "0" : hex;
    for (let index = 0; index < padded.length; index += 2) bytes.push(parseInt(padded.slice(index, index + 2), 16));
  } else {
    const literal = token.slice(1, -1);
    for (let index = 0; index < literal.length; index += 1) {
      let value = literal.charCodeAt(index);
      if (value > 255) return null;
      if (value === 92) { // PDF literal-string backslash escape.
        const next = literal[++index];
        if (next === undefined) break;
        if (next === "\r") { if (literal[index + 1] === "\n") index += 1; continue; }
        if (next === "\n") continue;
        const escapes: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
        if (next in escapes) value = escapes[next];
        else if (/[0-7]/.test(next)) {
          let octal = next;
          for (let step = 0; step < 2 && /[0-7]/.test(literal[index + 1] ?? ""); step += 1) octal += literal[++index];
          value = parseInt(octal, 8);
        } else value = next.charCodeAt(0);
      }
      bytes.push(value);
    }
  }
  const data = Uint8Array.from(bytes);
  if (cmap === null) return null; // A declared but unsupported ToUnicode map.
  if (cmap !== undefined) {
    const glyphs: string[] = [];
    for (let index = 0; index < data.length;) {
      const width = cmap.widthForFirstByte(data[index]);
      if (width === null || index + width > data.length) return null;
      const code = width === 1 ? data[index] : (data[index] << 8) | data[index + 1];
      const value = cmap.glyphs.get(code);
      if (value === undefined) return null; // Partial CMaps cannot justify a glyph.
      glyphs.push(value);
      index += width;
    }
    return glyphs.join("");
  }
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
    if ((data.length - 2) % 2 !== 0) return null;
    try { return new TextDecoder("utf-16be", { fatal: true }).decode(data.subarray(2)); } catch { return null; }
  }
  // The PDF font encoding can map high-bit bytes to arbitrary glyphs. A production
  // adapter must resolve /ToUnicode or a proven standard encoding before using them.
  if (data.some((value) => value > 0x7e || (value < 0x20 && ![9, 10, 13].includes(value)))) return null;
  return Buffer.from(data).toString("ascii");
}

export function extractPdfText(block: string, fontMaps?: ReadonlyMap<string, PdfUnicodeCMap | null>): string | null {
  const tokens = pdfTextTokens(block);
  if (!tokens) return null;
  const values: string[] = [];
  let currentCMap: PdfUnicodeCMap | null | undefined;
  let textLength = 0;
  const append = (value: string): boolean => {
    textLength += value.length;
    if (textLength > MAX_PDF_EXTRACTED_TEXT_CHARS) return false;
    values.push(value);
    return true;
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.raw === "Tf") {
      const font = tokens[index - 2];
      if (font?.kind !== "word" || !font.raw.startsWith("/")) return null;
      const selected = font.raw.slice(1);
      if (!fontMaps || !fontMaps.has(selected)) return null;
      currentCMap = fontMaps?.get(selected);
    } else if (token.raw === "Tj") {
      const operand = tokens[index - 1];
      if (operand?.kind !== "string") return null;
      const decoded = decodePdfString(operand.raw, currentCMap);
      if (decoded === null) return null;
      if (!append(decoded)) return null;
    } else if (token.raw === "TJ") {
      if (tokens[index - 1]?.raw !== "]") return null;
      let start = index - 2;
      while (start >= 0 && tokens[start].raw !== "[") start -= 1;
      if (start < 0) return null;
      for (let part = start + 1; part < index - 1; part += 1) {
        if (tokens[part].kind !== "string") continue; // Numeric kerning adjustments.
        const decoded = decodePdfString(tokens[part].raw, currentCMap);
        if (decoded === null) return null;
        if (!append(decoded)) return null;
      }
    }
  }
  return values.join(" ").replace(/\s+/g, " ").trim();
}
