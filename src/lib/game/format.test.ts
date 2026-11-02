import { describe, expect, it } from 'vitest';
import { formatPrice, formatYoy } from './format';

describe('format', () => {
  it('formats ARS prices with es-AR separators', () => {
    expect(formatPrice(2696.23)).toBe('$2.696,23');
    expect(formatPrice(16836.34)).toBe('$16.836,34');
    expect(formatPrice(753.4)).toBe('$753,40');
  });

  it('formats signed percentages with one decimal', () => {
    expect(formatYoy(257.9)).toBe('+257,9%');
    expect(formatYoy(-1.2)).toBe('-1,2%');
    expect(formatYoy(0)).toBe('0,0%');
  });
});
