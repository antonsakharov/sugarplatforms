/**
 * Bounded PNG "optimum" predictor reversal for PDF /FlateDecode streams.
 *
 * This local/demo adapter intentionally accepts only Predictor=15,
 * Colors=1, BitsPerComponent=8 and a directly declared Columns count.
 * Each row must carry an explicit PNG filter byte (0..4). All other
 * predictor layouts and parameters are rejected by the caller.
 */
export function undoPngPredictor15(input: Buffer, columns: number, maxBytes: number): Buffer | null {
  if (!Number.isSafeInteger(columns) || columns < 1 || columns > 4096 ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 1 || input.length > maxBytes) return null;
  const encodedRowBytes = columns + 1;
  if (input.length % encodedRowBytes !== 0) return null;
  const rows = input.length / encodedRowBytes;
  if (rows * columns > maxBytes) return null;
  const output = Buffer.alloc(rows * columns);
  for (let row = 0; row < rows; row += 1) {
    const source = row * encodedRowBytes;
    const target = row * columns;
    const filter = input[source];
    if (filter > 4) return null;
    for (let column = 0; column < columns; column += 1) {
      const left = column > 0 ? output[target + column - 1] : 0;
      const above = row > 0 ? output[target + column - columns] : 0;
      const upperLeft = row > 0 && column > 0 ? output[target + column - columns - 1] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left);
        const b = Math.abs(p - above);
        const c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      }
      output[target + column] = (input[source + column + 1] + predictor) & 0xff;
    }
  }
  return output;
}
