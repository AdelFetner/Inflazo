/**
 * Short, opaque code for a shared result: `/r/k3f9q2` instead of `/r/1/00011`.
 *
 * It is an encoding, not a hash: the page has to read the result back to show "Sacó 4 de 5", and a
 * day has only 32 possible results, so nothing here is secret. What it buys is looks and hygiene:
 * six characters that give nothing away at a glance, and a check that rejects hand-edited links.
 *
 * Layout of the 30-bit value, before mixing:  [3 zero bits][17 puzzle number][5 results][5 check]
 * Mixing is `y = x * A + B mod 2^30` with odd A, a bijection on 30 bits, so every code decodes to
 * exactly one value. A random code survives the zero bits and the check about 1 time in 256.
 */

const NUMBER_BITS = 17;
const GRID_BITS = 5;
const CHECK_BITS = 5;
const VALUE_BITS = 30;
const VALUE_MASK = 2 ** VALUE_BITS - 1;
const MAX_NUMBER = 2 ** NUMBER_BITS - 1;

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const CODE_PATTERN = /^[0-9a-hjkmnp-tv-z]{6}$/;

const A = 0x1b873593;
const B = 0x2c1b3c6d;
// Math.imul keeps the low 32 bits of a product exactly, which contains the low 30 bits we need.
// Inverse of A mod 2^32 by Newton's iteration (each step doubles the correct low bits).
const A_INVERSE = (() => {
  let inverse = A;
  for (let i = 0; i < 5; i++) inverse = Math.imul(inverse, 2 - Math.imul(A, inverse));
  return inverse;
})();

function checkBits(number: number, grid: number): number {
  return (Math.imul(number, 0x9e3779b1) ^ Math.imul(grid + 1, 0x85ebca6b)) >>> (32 - CHECK_BITS);
}

export function encodeResult(number: number, grid: string): string {
  if (!Number.isInteger(number) || number < 1 || number > MAX_NUMBER) throw new Error(`Puzzle number out of range: ${number}`);
  if (!/^[01]{5}$/.test(grid)) throw new Error(`Invalid grid: ${grid}`);
  const bits = Number.parseInt(grid, 2);
  const value = (((number << GRID_BITS) | bits) << CHECK_BITS) | checkBits(number, bits);
  let mixed = (Math.imul(value, A) + B) & VALUE_MASK;
  let code = '';
  for (let i = 0; i < VALUE_BITS / 5; i++) {
    code = ALPHABET[mixed & 31] + code;
    mixed >>>= 5;
  }
  return code;
}

/** The result a code stands for, or null for anything that is not a code this site produced for a puzzle up to `maxNumber`. */
export function decodeResult(code: string, maxNumber: number): { number: number; grid: string } | null {
  if (!CODE_PATTERN.test(code)) return null;
  let mixed = 0;
  for (const char of code) mixed = (mixed << 5) | ALPHABET.indexOf(char);
  const value = Math.imul(mixed - B, A_INVERSE) & VALUE_MASK;
  if (value >>> (NUMBER_BITS + GRID_BITS + CHECK_BITS) !== 0) return null;

  const check = value & (2 ** CHECK_BITS - 1);
  const bits = (value >>> CHECK_BITS) & (2 ** GRID_BITS - 1);
  const number = value >>> (CHECK_BITS + GRID_BITS);
  if (number < 1 || number > maxNumber || check !== checkBits(number, bits)) return null;
  return { number, grid: bits.toString(2).padStart(GRID_BITS, '0') };
}
