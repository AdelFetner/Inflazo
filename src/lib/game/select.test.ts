import { describe, expect, it } from 'vitest';
import { selectPuzzle } from './select';
import type { Puzzle } from './types';

const puzzles: Puzzle[] = [1, 2, 3].map((number) => ({
  number,
  date: `2026-11-0${number + 2}`,
  period: '202609',
  rounds: [],
}));

describe('selectPuzzle', () => {
  it('returns the puzzle for that Argentina date', () => {
    expect(selectPuzzle(puzzles, '2026-11-04')).toEqual({ puzzle: puzzles[1], spare: false });
  });

  it('shows puzzle #1 before launch day', () => {
    expect(selectPuzzle(puzzles, '2026-11-01')).toEqual({ puzzle: puzzles[0], spare: false });
  });

  it('falls back to the last puzzle as a spare when the day has none', () => {
    expect(selectPuzzle(puzzles, '2026-12-25')).toEqual({ puzzle: puzzles[2], spare: true });
  });

  it('fails loudly with no puzzles', () => {
    expect(() => selectPuzzle([], '2026-11-04')).toThrow('No puzzles');
  });
});
