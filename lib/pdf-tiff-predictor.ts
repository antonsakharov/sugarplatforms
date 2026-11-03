/**
 * Reverse the PDF TIFF Predictor 2 horizontal differencing subset.
 *
 * Only one 8-bit component per pixel is supported. Every row resets its
 * horizontal predictor; incomplete rows and oversized inputs fail closed.
 * This adapter never infers missing source bytes or PDF page coordinates.
 */
export function undoTiffPredictor2(input: Buffer, columns: number, maxBytes: number): Buffer | null {
  if (!Number.isSafeInteger(columns) || columns < 1 || columns > 4096 ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 1 || input.length > maxBytes ||
      input.length % columns !== 0) return null;
  const output = Buffer.alloc(input.length);
  for (let offset = 0; offset < input.length; offset += columns) {
    for (let column = 0; column < columns; column += 1) {
      const index = offset + column;
      const previous = column > 0 ? output[index - 1] : 0;
      output[index] = (input[index] + previous) & 0xff;
    }
  }
  return output;
}
