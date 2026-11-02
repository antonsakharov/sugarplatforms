/**
 * Byte-faithful, bounded PDF stream decoder shared by page contents and font CMaps.
 * Supports strict direct ASCIIHex/ASCII85/RunLength/LZW/Flate streams and
 * bounded single-channel Flate PNG Predictor=15 and TIFF Predictor=2 subsets.
 * Unsupported or ambiguous stream dictionaries fail closed (null).
 */
import { inflateSync } from "node:zlib";
import { runLengthDecode } from "./pdf-runlength.ts";
import { lzwDecode } from "./pdf-lzw.ts";
import { undoPngPredictor15 } from "./pdf-png-predictor.ts";
import { undoTiffPredictor2 } from "./pdf-tiff-predictor.ts";

const MAX_FILTERS = 3;

function dictionaryBeforeStream(objectBody: string, streamStart: number): string | null {
  const start = objectBody.indexOf("<<");
  if (start < 0 || start >= streamStart) return null;
  let depth = 0;
  for (let index = start; index < streamStart - 1; index += 1) {
    if (objectBody.slice(index, index + 2) === "<<") { depth += 1; index += 1; }
    else if (objectBody.slice(index, index + 2) === ">>") {
      depth -= 1; index += 1;
      if (depth === 0) return objectBody.slice(start, index + 1);
    }
  }
  return null;
}

type StreamConfig = { filters: string[]; predictor: 2 | 15 | null; columns: number | null };

function streamFilters(dictionary: string): StreamConfig | null {
  // A single direct dictionary is the only supported DecodeParms form.
  // Arrays, indirect objects, aliases and multiple declarations fail closed.
  const parms = [...dictionary.matchAll(/\/(?:DecodeParms|DP)\b/g)];
  if (parms.length > 1 || /\/DP\b/.test(dictionary)) return null;
  let predictor: 2 | 15 | null = null;
  let columns: number | null = null;
  if (parms.length === 1) {
    const after = dictionary.slice(parms[0].index! + parms[0][0].length).trimStart();
    if (!after.startsWith("<<")) return null;
    const close = after.indexOf(">>", 2);
    if (close < 0) return null;
    const body = after.slice(2, close);
    if (body.includes("<<") || body.includes("/" + "DecodeParms")) return null;
    const entries = [...body.matchAll(/\/([A-Za-z]+)\s+([0-9]+)(?=\s|$)/g)];
    if (body.replace(/\/([A-Za-z]+)\s+([0-9]+)(?=\s|$)/g, "").trim() !== "") return null;
    const values = new Map<string, number>();
    for (const [, key, raw] of entries) {
      if (!["Predictor", "Colors", "BitsPerComponent", "Columns"].includes(key) ||
          values.has(key) || !Number.isSafeInteger(Number(raw))) return null;
      values.set(key, Number(raw));
    }
    const requested = values.get("Predictor");
    if ((requested !== 2 && requested !== 15) || (values.get("Colors") ?? 1) !== 1 ||
        (values.get("BitsPerComponent") ?? 8) !== 8) return null;
    const width = values.get("Columns") ?? 1;
    if (width < 1 || width > 4096) return null;
    predictor = requested;
    columns = width;
  }
  const declarations = [...dictionary.matchAll(/\/Filter\b/g)];
  if (declarations.length === 0) return predictor === null ? { filters: [], predictor, columns } : null;
  if (declarations.length !== 1) return null;
  const rest = dictionary.slice(declarations[0].index! + declarations[0][0].length).trimStart();
  if (rest.startsWith("[")) {
    const close = rest.indexOf("]");
    if (close < 0) return null;
    const inside = rest.slice(1, close).trim();
    if (!inside) return null;
    const tokens = inside.split(/\s+/);
    if (tokens.length > MAX_FILTERS || tokens.some((token) => !/^\/[A-Za-z][A-Za-z0-9]*$/.test(token))) return null;
    const filters = tokens.map((token) => token.slice(1));
    return predictor === null ? { filters, predictor, columns } : null;
  }
  const match = /^\/([A-Za-z][A-Za-z0-9]*)(?=\s|$)/.exec(rest);
  if (!match) return null;
  const filters = [match[1]];
  if (predictor !== null && !["FlateDecode", "Fl"].includes(filters[0])) return null;
  return { filters, predictor, columns };
}

function asciiHexDecode(input: Buffer): Buffer | null {
  const source = input.toString("latin1");
  const marker = source.indexOf(">");
  if (marker < 0 || !/^\s*$/.test(source.slice(marker + 1))) return null;
  const hex = source.slice(0, marker).replace(/[\x00\x09\x0a\x0c\x0d\x20]/g, "");
  if (!/^[0-9a-fA-F]*$/.test(hex)) return null;
  return Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex");
}

/** Decode the PDF ASCII85Decode format (not Adobe's optional <~ wrapper).
 *
 * Requires the PDF ~> terminator, rejects stray bytes after it, validates
 * every base-85 group against the 32-bit limit, and caps output *during*
 * decoding so even hostile z-runs cannot allocate unbounded memory.
 */
function ascii85Decode(input: Buffer, maxBytes: number): Buffer | null {
  const output: number[] = [];
  const digits: number[] = [];
  let ended = false;
  const append = (value: number, count: number): boolean => {
    if (output.length + count > maxBytes) return false;
    for (let shift = 24; count > 0; shift -= 8, count -= 1) {
      output.push((value >>> shift) & 0xff);
    }
    return true;
  };
  const decodeGroup = (group: number[]): number | null => {
    let value = 0;
    for (const digit of group) value = value * 85 + digit;
    return value <= 0xffffffff ? value : null;
  };

  for (let index = 0; index < input.length; index += 1) {
    const byte = input[index];
    if (byte === 0 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 32) continue;
    if (ended) return null;
    if (byte === 126) { // ~> end-of-data marker is mandatory for PDF streams.
      if (input[++index] !== 62) return null;
      ended = true;
      continue;
    }
    if (byte === 122) { // z abbreviates four zero bytes, only at a group boundary.
      if (digits.length !== 0 || !append(0, 4)) return null;
      continue;
    }
    if (byte < 33 || byte > 117) return null; // ASCII85 alphabet: ! through u.
    digits.push(byte - 33);
    if (digits.length === 5) {
      const value = decodeGroup(digits);
      if (value === null || !append(value, 4)) return null;
      digits.length = 0;
    }
  }
  if (!ended || digits.length === 1) return null;
  if (digits.length > 1) {
    const count = digits.length - 1;
    while (digits.length < 5) digits.push(84); // 'u' padding for final partial group.
    const value = decodeGroup(digits);
    if (value === null || !append(value, count)) return null;
  }
  return Buffer.from(output);
}

/**
 * @param objectBody PDF object body represented as one-to-one latin1 bytes.
 * @param maxBytes Hard cap for encoded input and every decoded stage.
 * @returns Decoded one-to-one latin1 bytes, or null on any ambiguity/error.
 */
export function decodePdfStream(objectBody: string, maxBytes: number): string | null {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return null;
  const streamMatch = /\bstream\r?\n([\s\S]*?)\r?\nendstream\b/.exec(objectBody);
  if (!streamMatch) return null;
  const dictionary = dictionaryBeforeStream(objectBody, streamMatch.index);
  if (!dictionary) return null;
  const config = streamFilters(dictionary);
  if (config === null) return null;
  try {
    // Keep the buffer generic across native zlib and bounded decoder adapters.
    let decoded: Buffer = Buffer.from(streamMatch[1], "latin1");
    if (decoded.length > maxBytes) return null;
    for (const filter of config.filters) {
      if (filter === "ASCIIHexDecode" || filter === "AHx") {
        const result = asciiHexDecode(decoded);
        if (!result) return null;
        decoded = result;
      } else if (filter === "ASCII85Decode" || filter === "A85") {
        const result = ascii85Decode(decoded, maxBytes);
        if (!result) return null;
        decoded = result;
      } else if (filter === "RunLengthDecode" || filter === "RL") {
        const result = runLengthDecode(decoded, maxBytes);
        if (!result) return null;
        decoded = result;
      } else if (filter === "LZWDecode" || filter === "LZW") {
        const result = lzwDecode(decoded, maxBytes);
        if (!result) return null;
        decoded = result;
      } else if (filter === "FlateDecode" || filter === "Fl") {
        decoded = inflateSync(decoded, { maxOutputLength: maxBytes });
        if (config.predictor !== null && config.columns !== null) {
          const unpredicted = config.predictor === 15
            ? undoPngPredictor15(decoded, config.columns, maxBytes)
            : undoTiffPredictor2(decoded, config.columns, maxBytes);
          if (!unpredicted) return null;
          decoded = unpredicted;
        }
      } else return null;
      if (decoded.length > maxBytes) return null;
    }
    return decoded.toString("latin1");
  } catch {
    return null;
  }
}
