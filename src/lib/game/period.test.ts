import { describe, expect, it } from 'vitest';
import { formatPeriod, shiftPeriod } from './period';

describe('shiftPeriod', () => {
  it('moves across year boundaries', () => {
    expect(shiftPeriod('202609', -12)).toBe('202509');
    expect(shiftPeriod('202601', -1)).toBe('202512');
    expect(shiftPeriod('202512', 1)).toBe('202601');
  });

  it('rejects malformed periods', () => {
    expect(() => shiftPeriod('202613', 0)).toThrow('Invalid period');
    expect(() => shiftPeriod('2026-09', 0)).toThrow('Invalid period');
  });
});

describe('formatPeriod', () => {
  it('formats as short Spanish month and year', () => {
    expect(formatPeriod('202609')).toBe('sep 2026');
    expect(formatPeriod('202601')).toBe('ene 2026');
  });
});
