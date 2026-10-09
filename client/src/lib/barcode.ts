// Code 39 barcode for the job's product/job ID, so floor scanners can read it off the kiosk.
// Each character is 9 elements (bar, space, ...), "1" = wide, "0" = narrow.
const CODE39: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100',
};

const NARROW = 2;
const WIDE = 5;

/** Returns [x, width] for every bar of value encoded as Code 39 (with * start/stop). */
export function code39Bars(value: string): { bars: [number, number][]; width: number } {
  const chars = `*${value.toUpperCase().replace(/[^0-9A-Z. -]/g, '')}*`;
  const bars: [number, number][] = [];
  let x = 0;
  for (const ch of chars) {
    const pattern = CODE39[ch]!;
    [...pattern].forEach((bit, i) => {
      const w = bit === '1' ? WIDE : NARROW;
      if (i % 2 === 0) bars.push([x, w]);
      x += w;
    });
    x += NARROW; // inter-character gap
  }
  return { bars, width: x };
}
