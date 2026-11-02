import { describe, expect, it } from 'vitest';
import { gridFromAnswers, gridToEmoji, isValidGrid, ogImagePath, parseResultParams, shareMessage, shareText } from './share';
import type { Round } from './types';

const item = (code: string) => ({ code, name: code, unit: 'kg', from: 1, to: 2, yoy: 100 });
const round = (answer: 'a' | 'b'): Round => ({ a: item('A'), b: item('B'), answer });

describe('share text', () => {
  it('matches the exact share format: result, blank line, challenge + pitch, link', () => {
    expect(shareText(42, '11011', 'https://inflazo.adelfetner.com')).toBe(
      'Inflazo #42 · 4/5\n🟩🟩🟥🟩🟩\n\n¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇\nhttps://inflazo.adelfetner.com/r/42/11011',
    );
  });

  it('picks the challenge by score', () => {
    expect(shareText(1, '11111', 'https://x.ar')).toContain('¿Me igualás?');
    expect(shareText(1, '11100', 'https://x.ar')).toContain('¿Me ganás?');
    expect(shareText(1, '11000', 'https://x.ar')).toContain('¿Vos lo hacés mejor?');
  });

  it('does not double the slash when the site URL ends with one', () => {
    expect(shareText(1, '00000', 'https://x.ar/').endsWith('https://x.ar/r/1/00000')).toBe(true);
  });

  it('renders emoji per round', () => {
    expect(gridToEmoji('10')).toBe('🟩🟥');
  });

  it('adds the streak line from two days in a row', () => {
    expect(shareText(42, '11011', 'https://inflazo.adelfetner.com', 7)).toBe(
      'Inflazo #42 · 4/5\n🟩🟩🟥🟩🟩\n🔥 Racha: 7\n\n¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇\nhttps://inflazo.adelfetner.com/r/42/11011',
    );
    expect(shareText(42, '11011', 'https://inflazo.adelfetner.com', 1)).not.toContain('Racha');
  });

  it('splits the message into text and link for networks that take the link apart', () => {
    expect(shareMessage(42, '11011', 'https://inflazo.adelfetner.com/', 3)).toEqual({
      text: 'Inflazo #42 · 4/5\n🟩🟩🟥🟩🟩\n🔥 Racha: 3\n\n¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇',
      url: 'https://inflazo.adelfetner.com/r/42/11011',
    });
  });

  it('points at the result image', () => {
    expect(ogImagePath(42, '11011')).toBe('/api/og?n=42&g=11011');
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
