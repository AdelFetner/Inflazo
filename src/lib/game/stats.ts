import { ROUND_COUNT, gridScore } from './share';

export interface Stats {
  played: number;
  /** Index = score (0–5), value = games with that score. */
  distribution: number[];
  currentStreak: number;
  maxStreak: number;
}

export function computeStats(history: Record<string, string>, todayNumber: number): Stats {
  const numbers = Object.keys(history).map(Number).sort((a, b) => a - b);
  const distribution = Array.from({ length: ROUND_COUNT + 1 }, () => 0);
  for (const grid of Object.values(history)) distribution[gridScore(grid)]++;

  let maxStreak = 0;
  let run = 0;
  numbers.forEach((n, i) => {
    run = i > 0 && numbers[i - 1] === n - 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
  });

  const played = new Set(numbers);
  let cursor = played.has(todayNumber) ? todayNumber : todayNumber - 1;
  let currentStreak = 0;
  while (played.has(cursor)) {
    currentStreak++;
    cursor--;
  }

  return { played: numbers.length, distribution, currentStreak, maxStreak };
}
