import { describe, expect, it } from 'vitest';
import { gridFromAnswers, gridToEmoji, isValidGrid, parseResultParams, shareText } from './share';
import type { Round } from './types';

const item = (code: string) => ({ code, name: code, unit: 'kg', from: 1, to: 2, yoy: 100 });
const round = (answer: 'a' | 'b'): Round => ({ a: item('A'), b: item('B'), answer });

describe('share text', () => {
  it('matches the exact share format', () => {
    expect(shareText(42, '11011', 'https://quesubiomas.ar')).toBe(
      '¿Qué subió más? #42 4/5\n🟩🟩🟥🟩🟩\nhttps://quesubiomas.ar/r/42/11011',
    );
  });

  it('does not double the slash when the site URL ends with one', () => {
    expect(shareText(1, '00000', 'https://x.ar/').endsWith('https://x.ar/r/1/00000')).toBe(true);
  });

  it('renders emoji per round', () => {
    expect(gridToEmoji('10')).toBe('🟩🟥');
  });
});

describe('gridFromAnswers', () => {
  it('marks each answer against the round answer', () => {
    const rounds = [round('a'), round('b'), round('a'), round('b'), round('a')];
    expect(gridFromAnswers(rounds, ['a', 'a', 'a', 'b', 'b'])).toBe('10110');
  });
});

describe('isValidGrid', () => {
  it('accepts exactly five 0/1 characters', () => {
    expect(isValidGrid('11011')).toBe(true);
    for (const bad of ['1101', '110111', '22222', '1101a', '']) expect(isValidGrid(bad)).toBe(false);
  });
});

describe('parseResultParams', () => {
  it('accepts valid links up to the max number', () => {
    expect(parseResultParams('42', '11011', 100)).toEqual({ number: 42, grid: '11011' });
    expect(parseResultParams('100', '00000', 100)).toEqual({ number: 100, grid: '00000' });
  });

  it('rejects malformed or out-of-range links', () => {
    for (const [n, g] of [['0', '11011'], ['042', '11011'], ['4.2', '11011'], ['abc', '11011'], ['101', '11011'], ['42', '1101'], ['42', '22222']]) {
      expect(parseResultParams(n, g, 100)).toBeNull();
    }
  });
});
