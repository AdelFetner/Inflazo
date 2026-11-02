import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';

describe('computeStats', () => {
  it('counts games, score distribution and streaks', () => {
    expect(computeStats({ '1': '11111', '2': '10101', '4': '00000' }, 4)).toEqual({
      played: 3,
      distribution: [1, 0, 0, 1, 0, 1],
      currentStreak: 1,
      maxStreak: 2,
    });
  });

  it('keeps the streak alive until today is played', () => {
    expect(computeStats({ '3': '11111', '4': '11111' }, 5).currentStreak).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    expect(computeStats({ '3': '11111', '4': '11111' }, 6).currentStreak).toBe(0);
  });

  it('handles an empty history', () => {
    expect(computeStats({}, 10)).toEqual({ played: 0, distribution: [0, 0, 0, 0, 0, 0], currentStreak: 0, maxStreak: 0 });
  });
});
