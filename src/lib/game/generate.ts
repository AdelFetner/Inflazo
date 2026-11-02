import { dateForPuzzleNumber, puzzleNumberForDate } from './calendar';
import { shiftPeriod } from './period';
import { mulberry32 } from './prng';
import type { Period, PriceDataset, Puzzle, Round, RoundItem } from './types';

/** Allowed |yoy_a − yoy_b| per round, in percentage points: [min, max). */
export const ROUND_BANDS: ReadonlyArray<readonly [number, number]> = [
  [40, Infinity],
  [20, 40],
  [10, 20],
  [4, 10],
  [1, 4],
];
export const MIN_DIFF = 1;
export const HORIZON_DAYS = 60;

interface Pair {
  x: RoundItem;
  y: RoundItem;
  diff: number;
  key: string;
}

export function computeYoy(from: number, to: number): number {
  return Math.round((to / from - 1) * 1000) / 10;
}

export function pairKey(codeA: string, codeB: string): string {
  return codeA < codeB ? `${codeA}|${codeB}` : `${codeB}|${codeA}`;
}

export function candidateItems(dataset: PriceDataset, period: Period): RoundItem[] {
  const basePeriod = shiftPeriod(period, -12);
  return dataset.products
    .flatMap((product) => {
      const from = product.prices[basePeriod];
      const to = product.prices[period];
      if (from === undefined || to === undefined || from <= 0) return [];
      return [{ code: product.code, name: product.name, unit: product.unit, from, to, yoy: computeYoy(from, to) }];
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function buildPairs(items: RoundItem[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const diff = Math.round(Math.abs(items[i].yoy - items[j].yoy) * 10) / 10;
      if (diff >= MIN_DIFF) pairs.push({ x: items[i], y: items[j], diff, key: pairKey(items[i].code, items[j].code) });
    }
  }
  return pairs;
}

function distanceToBand(diff: number, [min, max]: readonly [number, number]): number {
  if (diff < min) return min - diff;
  if (diff >= max) return diff - max;
  return 0;
}

function closestToBand(pairs: Pair[], band: readonly [number, number]): Pair {
  return pairs.reduce((best, pair) => (distanceToBand(pair.diff, band) < distanceToBand(best.diff, band) ? pair : best));
}

export function generatePuzzle(
  items: RoundItem[],
  number: number,
  period: Period,
  usedPairs: ReadonlySet<string>,
): Puzzle {
  const rng = mulberry32(number);
  const pairs = buildPairs(items);
  const usedCodes = new Set<string>();

  const rounds: Round[] = ROUND_BANDS.map((band) => {
    const free = pairs.filter((p) => !usedCodes.has(p.x.code) && !usedCodes.has(p.y.code));
    const fresh = free.filter((p) => !usedPairs.has(p.key));
    // Once every pair of this period has been played, allow repeats rather than break the game.
    const eligible = fresh.length > 0 ? fresh : free;
    if (eligible.length === 0) throw new Error(`Not enough products to build puzzle #${number} for ${period}`);

    const inBand = eligible.filter((p) => p.diff >= band[0] && p.diff < band[1]);
    const pair = inBand.length > 0 ? inBand[Math.floor(rng() * inBand.length)] : closestToBand(eligible, band);
    usedCodes.add(pair.x.code);
    usedCodes.add(pair.y.code);

    const [higher, lower] = pair.x.yoy > pair.y.yoy ? [pair.x, pair.y] : [pair.y, pair.x];
    return rng() < 0.5 ? { a: higher, b: lower, answer: 'a' } : { a: lower, b: higher, answer: 'b' };
  });

  return { number, date: dateForPuzzleNumber(number), period, rounds };
}

/**
 * Returns puzzles #1 … (today's number + horizon). Puzzles dated on or before `today`
 * are kept verbatim from `existing`; every other puzzle is generated from `dataset.latestPeriod`.
 */
export function planPuzzles(
  dataset: PriceDataset,
  existing: Puzzle[],
  today: string,
  horizonDays: number = HORIZON_DAYS,
): Puzzle[] {
  const frozen = new Map(existing.filter((p) => p.date <= today).map((p) => [p.number, p]));
  const lastNumber = Math.max(0, puzzleNumberForDate(today)) + horizonDays;
  const items = candidateItems(dataset, dataset.latestPeriod);
  const usedByPeriod = new Map<Period, Set<string>>();
  const puzzles: Puzzle[] = [];

  for (let number = 1; number <= lastNumber; number++) {
    const puzzle =
      frozen.get(number) ??
      generatePuzzle(items, number, dataset.latestPeriod, usedByPeriod.get(dataset.latestPeriod) ?? new Set());
    const used = usedByPeriod.get(puzzle.period) ?? new Set<string>();
    for (const round of puzzle.rounds) used.add(pairKey(round.a.code, round.b.code));
    usedByPeriod.set(puzzle.period, used);
    puzzles.push(puzzle);
  }
  return puzzles;
}
