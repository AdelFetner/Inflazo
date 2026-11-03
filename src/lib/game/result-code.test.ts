import { describe, expect, it } from 'vitest';
import { decodeResult, encodeResult } from './result-code';

const ALL_GRIDS = Array.from({ length: 32 }, (_, i) => i.toString(2).padStart(5, '0'));

describe('result code', () => {
  it('round-trips every result of a day, for early and late puzzle numbers', () => {
    for (const number of [1, 2, 42, 365, 5000, 131071]) {
      for (const grid of ALL_GRIDS) {
        expect(decodeResult(encodeResult(number, grid), 131071)).toEqual({ number, grid });
      }
    }
  });

  it('is six lowercase characters from an alphabet without look-alikes', () => {
    for (const grid of ALL_GRIDS) expect(encodeResult(42, grid)).toMatch(/^[0-9a-hjkmnp-tv-z]{6}$/);
  });

  it('does not show the result: neighbouring results and days look unrelated', () => {
    const codes = ALL_GRIDS.map((grid) => encodeResult(1, grid));
    expect(new Set(codes).size).toBe(32);
    // A plain base-32 encoding would share the first characters across a day's results.
    expect(new Set(codes.map((c) => c.slice(0, 3))).size).toBeGreaterThan(24);
    expect(new Set([1, 2, 3, 4].map((n) => encodeResult(n, '11011').slice(0, 3))).size).toBe(4);
  });

  it('rejects numbers past today, so links to the future do not exist', () => {
    const code = encodeResult(50, '10101');
    expect(decodeResult(code, 50)).toEqual({ number: 50, grid: '10101' });
    expect(decodeResult(code, 49)).toBeNull();
  });

  it('rejects hand-edited codes: almost no single-character edit still decodes', () => {
    const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
    const code = encodeResult(42, '11011');
    let tried = 0;
    let accepted = 0;
    for (let i = 0; i < code.length; i++) {
      for (const ch of alphabet) {
        if (ch === code[i]) continue;
        tried++;
        if (decodeResult(code.slice(0, i) + ch + code.slice(i + 1), 131071)) accepted++;
      }
    }
    expect(accepted / tried).toBeLessThan(0.03);
  });

  it('rejects malformed input outright', () => {
    for (const bad of ['', 'abc', 'abcdefg', 'ABCDEF', 'ab-def', '1/11011', 'iiiiii', '000000']) {
      expect(decodeResult(bad, 131071)).toBeNull();
    }
  });

  it('refuses to encode what it cannot decode', () => {
    expect(() => encodeResult(0, '11011')).toThrow();
    expect(() => encodeResult(131072, '11011')).toThrow();
    expect(() => encodeResult(1, '1101')).toThrow();
  });
});
