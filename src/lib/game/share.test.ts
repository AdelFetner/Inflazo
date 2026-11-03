import { describe, expect, it } from 'vitest';
import { decodeResult } from './result-code';
import { gridFromAnswers, gridToEmoji, isValidGrid, ogImagePath, shareMessage, shareText } from './share';
import type { Round } from './types';

const item = (code: string) => ({ code, name: code, unit: 'kg', from: 1, to: 2, yoy: 100 });
const round = (answer: 'a' | 'b'): Round => ({ a: item('A'), b: item('B'), answer });

describe('share text', () => {
  it('matches the exact share format: result, blank line, challenge + pitch, link', () => {
    const lines = shareText(42, '11011', 'https://inflazo.adelfetner.com').split('\n');
    expect(lines.slice(0, 5)).toEqual([
      'Inflazo #42 · 4/5',
      '🟩🟩🟥🟩🟩',
      '',
      '¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇',
      expect.stringMatching(/^https:\/\/inflazo\.adelfetner\.com\/r\/[0-9a-z]{6}$/),
    ]);
    expect(lines).toHaveLength(5);
  });

  it('picks the challenge by score', () => {
    expect(shareText(1, '11111', 'https://x.ar')).toContain('¿Me igualás?');
    expect(shareText(1, '11100', 'https://x.ar')).toContain('¿Me ganás?');
    expect(shareText(1, '11000', 'https://x.ar')).toContain('¿Vos lo hacés mejor?');
  });

  it('does not double the slash when the site URL ends with one', () => {
    expect(shareText(1, '00000', 'https://x.ar/')).toMatch(/\nhttps:\/\/x\.ar\/r\/[0-9a-z]{6}$/);
  });

  it('renders emoji per round', () => {
    expect(gridToEmoji('10')).toBe('🟩🟥');
  });

  it('adds the streak line from two days in a row', () => {
    const withStreak = shareText(42, '11011', 'https://inflazo.adelfetner.com', 7);
    expect(withStreak).toContain('🟩🟩🟥🟩🟩\n🔥 Racha: 7\n\n¿Me ganás?');
    expect(shareText(42, '11011', 'https://inflazo.adelfetner.com', 1)).not.toContain('Racha');
  });

  it('splits the message into text and link for networks that take the link apart', () => {
    const { text, url } = shareMessage(42, '11011', 'https://inflazo.adelfetner.com/', 3);
    expect(text).toBe('Inflazo #42 · 4/5\n🟩🟩🟥🟩🟩\n🔥 Racha: 3\n\n¿Me ganás? Adiviná qué aumentó más en el súper, con precios del INDEC 👇');
    expect(url).toMatch(/^https:\/\/inflazo\.adelfetner\.com\/r\/[0-9a-z]{6}$/);
  });

  it('links to a result page whose code reads back as the shared result', () => {
    const { url } = shareMessage(42, '11011', 'https://inflazo.adelfetner.com', 3);
    expect(url).toMatch(/^https:\/\/inflazo\.adelfetner\.com\/r\/[0-9a-z]{6}$/);
    expect(decodeResult(url.split('/r/')[1], 100)).toEqual({ number: 42, grid: '11011' });
  });

  it('shows no raw results in the link', () => {
    expect(shareMessage(42, '11011', 'https://x.ar').url).not.toContain('11011');
  });

  it('points the preview image at the same code', () => {
    const code = shareMessage(42, '11011', 'https://x.ar').url.split('/r/')[1];
    expect(ogImagePath(42, '11011')).toBe(`/api/og?c=${code}`);
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

