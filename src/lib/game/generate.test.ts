import { describe, expect, it } from 'vitest';
import {
  HORIZON_DAYS,
  MIN_DIFF,
  ROUND_BANDS,
  candidateItems,
  computeYoy,
  generatePuzzle,
  pairKey,
  planPuzzles,
} from './generate';
import { dateForPuzzleNumber } from './calendar';
import { shiftPeriod } from './period';
import type { PriceDataset, Puzzle, Round } from './types';

function dataset(yoys: number[], period = '202609'): PriceDataset {
  const base = shiftPeriod(period, -12);
  return {
    source: 'test',
    fetchedAt: '2026-11-02T00:00:00Z',
    latestPeriod: period,
    products: yoys.map((yoy, i) => ({
      code: `P${String(i).padStart(2, '0')}`,
      name: `Producto ${i}`,
      unit: 'kg',
      prices: { [base]: 1000, [period]: 1000 * (1 + yoy / 100) },
    })),
  };
}

const diff = (round: Round) => Math.round(Math.abs(round.a.yoy - round.b.yoy) * 10) / 10;
const codes = (puzzle: Puzzle) => puzzle.rounds.flatMap((r) => [r.a.code, r.b.code]);
// 40 products, yoy 0, 2.5, 5, …, 97.5: every band always has candidates.
const RICH = dataset(Array.from({ length: 40 }, (_, i) => i * 2.5));

describe('computeYoy', () => {
  it('rounds to one decimal, including negatives', () => {
    expect(computeYoy(753.4, 2696.23)).toBe(257.9);
    expect(computeYoy(3987.33, 3940.5)).toBe(-1.2);
  });
});

describe('candidateItems', () => {
  it('skips products without a price 12 months earlier', () => {
    const ds = dataset([10, 20]);
    delete ds.products[1].prices['202509'];
    expect(candidateItems(ds, '202609').map((i) => i.code)).toEqual(['P00']);
  });
});

describe('generatePuzzle', () => {
  const items = candidateItems(RICH, '202609');

  it('is deterministic for the same number', () => {
    expect(generatePuzzle(items, 7, '202609', new Set())).toEqual(generatePuzzle(items, 7, '202609', new Set()));
  });

  it('never repeats a product within a puzzle and marks the bigger yoy as the answer', () => {
    for (let n = 1; n <= 30; n++) {
      const puzzle = generatePuzzle(items, n, '202609', new Set());
      expect(new Set(codes(puzzle)).size).toBe(10);
      for (const round of puzzle.rounds) {
        const winner = round.answer === 'a' ? round.a : round.b;
        const loser = round.answer === 'a' ? round.b : round.a;
        expect(winner.yoy).toBeGreaterThan(loser.yoy);
      }
    }
  });

  it('puts each round inside its difficulty band when candidates exist', () => {
    for (let n = 1; n <= 30; n++) {
      generatePuzzle(items, n, '202609', new Set()).rounds.forEach((round, i) => {
        const [lo, hi] = ROUND_BANDS[i];
        expect(diff(round)).toBeGreaterThanOrEqual(lo);
        expect(diff(round)).toBeLessThan(hi);
      });
    }
  });

  it('falls back to the closest eligible pair when a band is empty', () => {
    const sparse = candidateItems(dataset([0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550]), '202609');
    for (let n = 1; n <= 20; n++) {
      const puzzle = generatePuzzle(sparse, n, '202609', new Set());
      // Band [20,40) is empty; with only 2 products used, an adjacent pair (diff 50) always remains.
      expect(diff(puzzle.rounds[1])).toBe(50);
      // Band [1,4) is empty; round 5 must take the smallest difference among the products still free.
      const used = new Set(puzzle.rounds.slice(0, 4).flatMap((r) => [r.a.code, r.b.code]));
      const free = sparse.filter((i) => !used.has(i.code));
      const smallest = Math.min(...free.flatMap((x, i) => free.slice(i + 1).map((y) => Math.abs(x.yoy - y.yoy))));
      expect(diff(puzzle.rounds[4])).toBe(smallest);
    }
  });

  it('never pairs products whose difference is below the minimum', () => {
    const ties = candidateItems(dataset([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20]), '202609');
    expect(() => generatePuzzle(ties, 1, '202609', new Set())).toThrow('Not enough products');
    expect(MIN_DIFF).toBe(1);
  });

  it('avoids pairs already used in the same period', () => {
    const first = generatePuzzle(items, 1, '202609', new Set());
    const used = new Set(first.rounds.map((r) => pairKey(r.a.code, r.b.code)));
    const again = generatePuzzle(items, 1, '202609', used);
    for (const round of again.rounds) expect(used.has(pairKey(round.a.code, round.b.code))).toBe(false);
  });
});

describe('planPuzzles', () => {
  it('generates every puzzle from #1 through today + horizon', () => {
    const plan = planPuzzles(RICH, [], '2026-11-10'); // today is #8
    expect(plan.map((p) => p.number)).toEqual(Array.from({ length: 8 + HORIZON_DAYS }, (_, i) => i + 1));
    for (const p of plan) expect(p.date).toBe(dateForPuzzleNumber(p.number));
  });

  it('plans the horizon even before launch day', () => {
    expect(planPuzzles(RICH, [], '2026-11-02')).toHaveLength(HORIZON_DAYS);
  });

  it('freezes puzzles up to today and regenerates future ones with new data', () => {
    const before = planPuzzles(dataset(Array.from({ length: 40 }, (_, i) => i * 2.5), '202608'), [], '2026-11-10');
    const after = planPuzzles(RICH, before, '2026-11-10');
    expect(after.slice(0, 8)).toEqual(before.slice(0, 8));
    expect(after[8].period).toBe('202609');
  });

  it('does not repeat a pair within a period while unused pairs remain', () => {
    const plan = planPuzzles(RICH, [], '2026-11-10'); // 68 puzzles × 5 = 340 rounds < 780 pairs
    const keys = plan.flatMap((p) => p.rounds.map((r) => pairKey(r.a.code, r.b.code)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps producing valid puzzles after every pair has been used', () => {
    const small = dataset([0, 5, 12, 20, 33, 47, 60, 85, 110, 150]); // 45 pairs < 61 × 5 rounds
    const plan = planPuzzles(small, [], '2026-11-03');
    expect(plan).toHaveLength(1 + HORIZON_DAYS);
    for (const puzzle of plan) expect(new Set(codes(puzzle)).size).toBe(10);
  });
});
