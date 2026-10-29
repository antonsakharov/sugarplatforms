/**
 * Strict PDF LZWDecode, default EarlyChange=1 only.
 *
 * Uses bounded prefix/suffix tables instead of retaining expanded strings.
 * Codes are MSB-first, 9..12 bits, with clear=256 and EOD=257. Rejects
 * truncated streams, invalid dictionary references, missing EOD, and any
 * nonzero trailing padding bits. /DecodeParms (including EarlyChange=0)
 * is intentionally rejected by the shared stream-dictionary parser.
 */
export function lzwDecode(input: Buffer, maxBytes: number): Buffer | null {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 4 * 1024 * 1024) return null;
  if (input.length > maxBytes) return null;

  const prefixes = new Uint16Array(4096);
  const suffixes = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  const output = Buffer.allocUnsafe(maxBytes);
  let bitPosition = 0;
  let written = 0;
  let codeWidth = 9;
  let nextCode = 258;
  let previous = -1;
  let sawClear = false;

  function readCode(): number | null {
    if (bitPosition + codeWidth > input.length * 8) return null;
    let value = 0;
    for (let index = 0; index < codeWidth; index += 1) {
      const position = bitPosition++;
      value = (value << 1) | ((input[position >>> 3] >>> (7 - (position & 7))) & 1);
    }
    return value;
  }

  function expand(code: number): number | null {
    let depth = 0;
    let cursor = code;
    while (cursor >= 256) {
      if (cursor >= nextCode || cursor < 258 || depth >= 4096) return null;
      stack[depth++] = suffixes[cursor];
      cursor = prefixes[cursor];
    }
    if (depth >= 4096) return null;
    stack[depth++] = cursor;
    return depth;
  }

  while (true) {
    const code = readCode();
    if (code === null) return null;
    if (code === 256) {
      sawClear = true;
      codeWidth = 9;
      nextCode = 258;
      previous = -1;
      continue;
    }
    if (!sawClear) return null;
    if (code === 257) {
      // The only valid remainder is the unused zero padding of the last byte.
      if (input.length * 8 - bitPosition >= 8) return null;
      for (let bit = bitPosition; bit < input.length * 8; bit += 1) {
        if ((input[bit >>> 3] >>> (7 - (bit & 7))) & 1) return null;
      }
      return output.subarray(0, written);
    }

    const special = code === nextCode && previous >= 0 && nextCode < 4096;
    if (code > nextCode || (code === nextCode && !special)) return null;
    const length = expand(special ? previous : code);
    if (length === null) return null;
    const firstByte = stack[length - 1];
    const extra = special ? 1 : 0;
    if (written + length + extra > maxBytes) return null;
    for (let index = length - 1; index >= 0; index -= 1) output[written++] = stack[index];
    if (special) output[written++] = firstByte;

    if (previous >= 0 && nextCode < 4096) {
      prefixes[nextCode] = previous;
      suffixes[nextCode] = firstByte;
      nextCode += 1;
      // PDF defaults to EarlyChange=1: grow *before* reading the next code.
      if (codeWidth < 12 && nextCode + 1 === 1 << codeWidth) codeWidth += 1;
    }
    previous = code;
  }
}
