/**
 * Decode PDF RunLengthDecode (RL) without allocating beyond maxBytes.
 * 0..127 copies the following n+1 bytes; 129..255 repeats one byte
 * 257-n times; 128 terminates the encoded stream. No truncated runs,
 * missing terminators, or non-whitespace bytes after EOD are accepted.
 */
export function runLengthDecode(input: Buffer, maxBytes: number): Buffer | null {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 4 * 1024 * 1024) return null;
  if (input.length > maxBytes) return null;
  const output = Buffer.allocUnsafe(maxBytes);
  let read = 0;
  let written = 0;
  let terminated = false;
  while (read < input.length) {
    const control = input[read++];
    if (control === 128) {
      terminated = true;
      break;
    }
    if (control <= 127) {
      const count = control + 1;
      if (read + count > input.length || written + count > maxBytes) return null;
      input.copy(output, written, read, read + count);
      read += count;
      written += count;
    } else {
      const count = 257 - control;
      if (read >= input.length || written + count > maxBytes) return null;
      output.fill(input[read++], written, written + count);
      written += count;
    }
  }
  if (!terminated) return null;
  for (; read < input.length; read += 1) {
    const byte = input[read];
    if (byte !== 0 && byte !== 9 && byte !== 10 && byte !== 12 && byte !== 13 && byte !== 32) return null;
  }
  return output.subarray(0, written);
}

