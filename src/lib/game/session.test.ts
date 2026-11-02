import { describe, expect, it } from 'vitest';
import { answersFor, recordAnswer } from './session';
import { emptyState } from './storage';
import type { Puzzle } from './types';

const item = (code: string) => ({ code, name: code, unit: 'kg', from: 1, to: 2, yoy: 100 });
const puzzle = (number: number): Puzzle => ({
  number,
  date: '2026-11-03',
  period: '202609',
  rounds: Array.from({ length: 5 }, () => ({ a: item('A'), b: item('B'), answer: 'a' as const })),
});

describe('recordAnswer', () => {
  it('records answers in order and completes the history on the fifth', () => {
    let state = emptyState();
    for (const answer of ['a', 'b', 'a', 'a', 'b'] as const) state = recordAnswer(state, puzzle(4), answer);
    expect(answersFor(state, 4)).toEqual(['a', 'b', 'a', 'a', 'b']);
    expect(state.history['4']).toBe('10110');
  });

  it('ignores answers once the puzzle is complete', () => {
    let state = emptyState();
    for (let i = 0; i < 5; i++) state = recordAnswer(state, puzzle(4), 'a');
    expect(recordAnswer(state, puzzle(4), 'b')).toBe(state);
  });

  it('resets progress when a new puzzle starts', () => {
    let state = recordAnswer(emptyState(), puzzle(4), 'a');
    state = recordAnswer(state, puzzle(5), 'b');
    expect(answersFor(state, 5)).toEqual(['b']);
    expect(answersFor(state, 4)).toEqual([]);
  });
});
