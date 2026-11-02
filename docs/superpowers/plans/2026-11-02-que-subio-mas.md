# ¿Qué subió más? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily Wordle-style web game where players pick which of two INDEC products rose more in price over 12 months, with shareable emoji results and OG images.

**Architecture:** Server-side scripts pull INDEC average prices (GBA) into `data/prices.json` and deterministically generate frozen daily puzzles into `data/puzzles.json`. A Next.js App Router site renders today's puzzle (ISR, 60 s), keeps all player state in `localStorage`, and exposes `/r/[number]/[grid]` share pages plus a dynamic `/api/og` image. A GitHub Action refreshes data twice a day.

**Tech Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4), zod, tsx, Vitest, Playwright, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-02-que-subio-mas-design.md`

## Global Constraints

- Node 24, npm. Dev machine is Windows with Git Bash: npm scripts must be cross-platform (only `&&` chaining, no `rm`, `cp`, env-var prefixes).
- Next.js App Router via `create-next-app@latest`, `src/` dir, import alias `@/*`, Tailwind v4, ESLint.
- Code under `src/lib/**` and `scripts/**` uses **relative imports only** (no `@/`), so `tsx` scripts, Vitest and Playwright resolve it without alias config. Components and app routes may use `@/`.
- Only Task 1 installs dependencies. Allowed runtime deps: `next`, `react`, `react-dom`, `zod`. Allowed dev deps: those from create-next-app plus `tsx`, `vitest`, `@playwright/test`. No other packages.
- Data source: `GET https://api.indec.gob.ar/v1/ipc_nacional` with `tipo_de_indicador=eq.Precio promedio`, `region=eq.GBA`, `limit=1000`, `offset`, `order=clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida`, headers `Authorization: Bearer <token>`, `Prefer: count=exact`. Success = status 200 or 206; total rows from `Content-Range: a-b/total`.
- `INDEC_API_TOKEN` is read only by `scripts/ingest.ts`. It must never be referenced from `src/app/**` or `src/components/**`.
- Calendar: `EPOCH_DATE = '2026-11-03'` is puzzle #1; time zone `America/Argentina/Buenos_Aires` (UTC−03:00, no DST); puzzle number = days since epoch + 1.
- Difficulty bands by `|yoy_a − yoy_b|` (percentage points, rounded to 0.1): round 1 `[40, ∞)`, round 2 `[20, 40)`, round 3 `[10, 20)`, round 4 `[4, 10)`, round 5 `[1, 4)`. Minimum difference 1 pp. Horizon: 60 days of future puzzles.
- `yoy = round((price[period] / price[period − 12 months] − 1) × 100, 1 decimal)`.
- Share text, exactly (three lines, `\n` separators, no trailing newline):
  `¿Qué subió más? #<n> <score>/5` / `<5 emoji, 🟩 correct, 🟥 wrong>` / `<siteUrl>/r/<n>/<grid>`; `grid` = 5 chars of `1` (correct) / `0` (wrong).
- `localStorage` key: `que-subio-mas:v1`.
- All user-facing copy in Spanish (Argentina, voseo: "Jugá", "Compartí").
- Committing: each implementer commits only its own files: `git add <files>` then `git commit -m "<msg>" -- <files>`. If git reports `index.lock` exists, wait 5 s and retry (other tasks may run in parallel).
- Do not run `next dev`/`next build` in Tasks 2–4 (they may run in parallel; only Vitest is safe to run concurrently).

## Review Focus

1. Reload in the middle of a game: player expects to resume at the next unanswered round with earlier answers kept, never recording a round twice. → Task 4 (`session.test.ts`, `storage.test.ts`), Task 8 (e2e "resumes after reload").
2. Page left open (or served from cache) across Argentina midnight: player expects today's puzzle, not yesterday's. → Task 1 (`calendar.test.ts` midnight boundary), Task 6 (stale-page refresh on mount and when countdown hits zero).
3. Corrupted or foreign `localStorage` (invalid JSON, other version, bad grid strings, bad answers): game must start clean instead of crashing. → Task 4 (`storage.test.ts`).
4. Hand-edited share links (`/r/0/11111`, `/r/042/11111`, `/r/abc/11111`, `/r/1/2`, `/r/<future>/11111`): expect 404 page; `/api/og` with bad params expects 400. → Task 4 (`share.test.ts` `parseResultParams`), Task 8 (e2e).
5. INDEC API trouble (expired token 401, pagination total mismatch, `///` null markers): ingest exits non-zero and leaves `data/*.json` untouched; `///` rows are excluded, never written as numbers. → Task 3 (`indec-client.test.ts`, `normalize.test.ts`).

## Execution waves

- Wave 1: Task 1.
- Wave 2 (parallel, disjoint files): Task 2, Task 3, Task 4.
- Wave 3: Task 5 (needs Tasks 2–3 to produce real data).
- Wave 4: Task 6, then Task 7 (sequential: both need `next build`/`next dev`, which share `.next/`).
- Wave 5: Task 8.

## File map

```
data/prices.json                 (Task 5 generates via Task 3 script)
data/puzzles.json                (Task 5 generates via Task 2 script)
scripts/lib/json-file.ts         Task 1  readJsonIfExists / writeJsonAtomic
scripts/ingest.ts                Task 3
scripts/generate-puzzles.ts      Task 2
src/lib/game/types.ts            Task 1  shared types
src/lib/game/period.ts           Task 1  AAAAMM helpers
src/lib/game/calendar.ts         Task 1  AR date / puzzle numbering
src/lib/game/prng.ts             Task 1  mulberry32
src/lib/game/generate.ts         Task 2  yoy, candidate items, puzzle generation, planning
src/lib/game/share.ts            Task 4  grid, share text, share-link parsing
src/lib/game/stats.ts            Task 4  streaks / distribution
src/lib/game/storage.ts          Task 4  localStorage load/save + validation
src/lib/game/session.ts          Task 4  pure game-progress transitions
src/lib/game/format.ts           Task 4  price / percent formatting (es-AR)
src/lib/game/select.ts           Task 5  pick puzzle for a date
src/lib/data/puzzles.ts          Task 5  load data/puzzles.json, today's selection
src/lib/site.ts                  Task 5  site URL
src/lib/ingest/indec-client.ts   Task 3  paginated API client
src/lib/ingest/normalize.ts      Task 3  rows → PriceDataset
src/app/layout.tsx, globals.css, page.tsx, src/components/game/*   Task 6
src/app/r/[number]/[grid]/page.tsx, src/app/api/og/route.tsx, src/app/opengraph-image.tsx   Task 7
.github/workflows/update-data.yml, playwright.config.ts, e2e/*, README.md   Task 8
tests/fixtures/indec-precio-promedio-rows.json   already committed with this plan (25 real API rows)
```

---

### Task 1: Project scaffold and core time/period utilities

**Files:**
- Create (via create-next-app, copied in): `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`, `public/*`, `.gitignore` (merged)
- Create: `vitest.config.ts`, `.env.example`, `scripts/lib/json-file.ts`
- Create: `src/lib/game/types.ts`, `src/lib/game/period.ts`, `src/lib/game/calendar.ts`, `src/lib/game/prng.ts`
- Test: `src/lib/game/period.test.ts`, `src/lib/game/calendar.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts`: `Period`, `Product`, `PriceDataset`, `RoundItem`, `Round`, `Answer`, `Puzzle` (exact definitions below).
  - `period.ts`: `shiftPeriod(period: Period, months: number): Period`, `formatPeriod(period: Period): string`.
  - `calendar.ts`: `EPOCH_DATE`, `TIME_ZONE`, `argentinaDate(now: Date): string`, `puzzleNumberForDate(isoDate: string): number`, `dateForPuzzleNumber(n: number): string`, `msUntilNextPuzzle(now: Date): number`.
  - `prng.ts`: `mulberry32(seed: number): () => number`.
  - `scripts/lib/json-file.ts`: `readJsonIfExists<T>(path: string): Promise<T | null>`, `writeJsonAtomic(path: string, value: unknown): Promise<void>`.
  - npm scripts: `test`, `ingest`, `generate`, `data`, `e2e` (exact values below).

- [ ] **Step 1: Scaffold Next.js in a sibling temp dir** (the repo dir is not empty, so create-next-app cannot run in place)

```bash
cd C:/Users/bruno
npx create-next-app@latest qsm-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: `qsm-scaffold/` with `package.json`, `src/app/page.tsx`. If the CLI still prompts, accept defaults.

- [ ] **Step 2: Copy the scaffold into the repo and merge `.gitignore`**

```bash
cd C:/Users/bruno/qsm-scaffold
rm -rf node_modules .git README.md
cp -r . ../que-subio-mas/.scaffold-tmp
cd ../que-subio-mas
mv .scaffold-tmp/.gitignore .gitignore.scaffold
cp -r .scaffold-tmp/. .
rm -rf .scaffold-tmp ../qsm-scaffold
cat .gitignore.scaffold >> .gitignore && rm .gitignore.scaffold
```

Then edit `.gitignore` so it contains, de-duplicated: everything from the scaffold, plus `.superpowers/`, `.env*`, `!.env.example`, `test-results/`, `playwright-report/`. Confirm `.env.local` is still ignored: `git check-ignore .env.local` prints `.env.local`.

- [ ] **Step 3: Install dependencies**

```bash
npm install
npm install zod
npm install -D tsx vitest @playwright/test
```

- [ ] **Step 4: Add npm scripts** — in `package.json` `"scripts"`, keep `dev`, `build`, `start`, `lint` from the scaffold and add:

```json
"test": "vitest run",
"ingest": "node --env-file-if-exists=.env.local --import tsx scripts/ingest.ts",
"generate": "node --import tsx scripts/generate-puzzles.ts",
"data": "npm run ingest && npm run generate",
"e2e": "playwright test"
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create `.env.example`**

```
INDEC_API_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 7: Create `src/lib/game/types.ts`**

```ts
/** INDEC period, `AAAAMM` (e.g. `202609`). */
export type Period = string;

export interface Product {
  code: string;
  name: string;
  /** Unit label without the "Valor por " prefix: `kg`, `500 g`, `Litro`, `Docena`, … */
  unit: string;
  /** Average price in ARS by period. */
  prices: Record<Period, number>;
}

export interface PriceDataset {
  source: string;
  fetchedAt: string;
  latestPeriod: Period;
  products: Product[];
}

export interface RoundItem {
  code: string;
  name: string;
  unit: string;
  /** Price 12 months before the puzzle period. */
  from: number;
  /** Price at the puzzle period. */
  to: number;
  /** Year-over-year change in percent, one decimal. */
  yoy: number;
}

export type Answer = 'a' | 'b';

export interface Round {
  a: RoundItem;
  b: RoundItem;
  answer: Answer;
}

export interface Puzzle {
  number: number;
  /** `YYYY-MM-DD`, Argentina calendar day. */
  date: string;
  period: Period;
  rounds: Round[];
}
```

- [ ] **Step 8: Write failing tests `src/lib/game/period.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatPeriod, shiftPeriod } from './period';

describe('shiftPeriod', () => {
  it('moves across year boundaries', () => {
    expect(shiftPeriod('202609', -12)).toBe('202509');
    expect(shiftPeriod('202601', -1)).toBe('202512');
    expect(shiftPeriod('202512', 1)).toBe('202601');
  });

  it('rejects malformed periods', () => {
    expect(() => shiftPeriod('202613', 0)).toThrow('Invalid period');
    expect(() => shiftPeriod('2026-09', 0)).toThrow('Invalid period');
  });
});

describe('formatPeriod', () => {
  it('formats as short Spanish month and year', () => {
    expect(formatPeriod('202609')).toBe('sep 2026');
    expect(formatPeriod('202601')).toBe('ene 2026');
  });
});
```

- [ ] **Step 9: Write failing tests `src/lib/game/calendar.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { argentinaDate, dateForPuzzleNumber, msUntilNextPuzzle, puzzleNumberForDate } from './calendar';

describe('argentinaDate', () => {
  it('uses the Argentina calendar day, not UTC', () => {
    expect(argentinaDate(new Date('2026-11-03T02:59:59Z'))).toBe('2026-11-02');
    expect(argentinaDate(new Date('2026-11-03T03:00:00Z'))).toBe('2026-11-03');
  });
});

describe('puzzle numbering', () => {
  it('counts days from the epoch', () => {
    expect(puzzleNumberForDate('2026-11-02')).toBe(0);
    expect(puzzleNumberForDate('2026-11-03')).toBe(1);
    expect(puzzleNumberForDate('2027-01-01')).toBe(60);
  });

  it('round-trips number and date', () => {
    for (const n of [1, 2, 60, 365, 1000]) {
      expect(puzzleNumberForDate(dateForPuzzleNumber(n))).toBe(n);
    }
    expect(dateForPuzzleNumber(60)).toBe('2027-01-01');
  });

  it('rejects malformed dates', () => {
    expect(() => puzzleNumberForDate('2026-11-3')).toThrow('Invalid date');
  });
});

describe('msUntilNextPuzzle', () => {
  it('counts down to Argentina midnight', () => {
    expect(msUntilNextPuzzle(new Date('2026-11-03T02:59:59Z'))).toBe(1000);
    expect(msUntilNextPuzzle(new Date('2026-11-03T03:00:00Z'))).toBe(86_400_000);
  });
});
```

- [ ] **Step 10: Run to verify failure**

Run: `npx vitest run src/lib/game`
Expected: FAIL — cannot resolve `./period` / `./calendar`.

- [ ] **Step 11: Implement `src/lib/game/period.ts`**

```ts
import type { Period } from './types';

const PERIOD_PATTERN = /^(\d{4})(0[1-9]|1[0-2])$/;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parsePeriod(period: Period): { year: number; month: number } {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function shiftPeriod(period: Period, months: number): Period {
  const { year, month } = parsePeriod(period);
  const index = year * 12 + (month - 1) + months;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = index - shiftedYear * 12 + 1;
  return `${shiftedYear}${String(shiftedMonth).padStart(2, '0')}`;
}

export function formatPeriod(period: Period): string {
  const { year, month } = parsePeriod(period);
  return `${MONTHS[month - 1]} ${year}`;
}
```

- [ ] **Step 12: Implement `src/lib/game/calendar.ts`**

```ts
export const EPOCH_DATE = '2026-11-03';
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const DAY_MS = 86_400_000;
/** Argentina uses UTC−03:00 all year (no DST since 2009). */
const ARGENTINA_UTC_OFFSET_MS = -3 * 3_600_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const argentinaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isoDateToUtcMs(isoDate: string): number {
  if (!ISO_DATE_PATTERN.test(isoDate)) throw new Error(`Invalid date: ${isoDate}`);
  return Date.parse(`${isoDate}T00:00:00Z`);
}

/** Calendar day in Argentina as `YYYY-MM-DD`. */
export function argentinaDate(now: Date): string {
  return argentinaDateFormatter.format(now);
}

export function puzzleNumberForDate(isoDate: string): number {
  return Math.round((isoDateToUtcMs(isoDate) - isoDateToUtcMs(EPOCH_DATE)) / DAY_MS) + 1;
}

export function dateForPuzzleNumber(n: number): string {
  return new Date(isoDateToUtcMs(EPOCH_DATE) + (n - 1) * DAY_MS).toISOString().slice(0, 10);
}

export function msUntilNextPuzzle(now: Date): number {
  const nextMidnightUtcMs = isoDateToUtcMs(argentinaDate(now)) + DAY_MS - ARGENTINA_UTC_OFFSET_MS;
  return nextMidnightUtcMs - now.getTime();
}
```

- [ ] **Step 13: Implement `src/lib/game/prng.ts`**

```ts
/** Deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
```

- [ ] **Step 14: Implement `scripts/lib/json-file.ts`**

```ts
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Writes pretty JSON via temp file + rename so readers never see a half-written file. */
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}
```

- [ ] **Step 15: Run tests, lint, build**

Run: `npm test` → Expected: PASS (period + calendar, 0 failures, no warnings).
Run: `npm run lint` → Expected: no errors.
Run: `npm run build` → Expected: build succeeds (default scaffold page).

- [ ] **Step 16: Commit**

```bash
git add -A
git status --short   # confirm .env.local is NOT listed
git commit -m "chore: scaffold Next.js app with core calendar and period utilities"
```

---

### Task 2: Puzzle generator and `generate` script

**Files:**
- Create: `src/lib/game/generate.ts`, `scripts/generate-puzzles.ts`
- Test: `src/lib/game/generate.test.ts`

**Interfaces:**
- Consumes (Task 1): types from `./types`; `shiftPeriod` from `./period`; `mulberry32` from `./prng`; `dateForPuzzleNumber`, `puzzleNumberForDate`, `argentinaDate` from `./calendar`; `readJsonIfExists`, `writeJsonAtomic` from `scripts/lib/json-file.ts`.
- Produces:
  - `ROUND_BANDS: ReadonlyArray<readonly [number, number]>`, `MIN_DIFF = 1`, `HORIZON_DAYS = 60`
  - `computeYoy(from: number, to: number): number`
  - `candidateItems(dataset: PriceDataset, period: Period): RoundItem[]`
  - `pairKey(codeA: string, codeB: string): string`
  - `generatePuzzle(items: RoundItem[], number: number, period: Period, usedPairs: ReadonlySet<string>): Puzzle`
  - `planPuzzles(dataset: PriceDataset, existing: Puzzle[], today: string, horizonDays?: number): Puzzle[]`
  - `npm run generate` reads `data/prices.json` (+ `data/puzzles.json` if present) and writes `data/puzzles.json`.

Rules (from spec): same inputs ⇒ same puzzle; no product twice within a puzzle; no repeated pair among puzzles sharing a period while unused pairs remain (when exhausted, reuse is allowed so the game never breaks); band per round, falling back to the eligible pair closest to the band; puzzles dated ≤ today are frozen verbatim.

- [ ] **Step 1: Write failing tests `src/lib/game/generate.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/game/generate.test.ts`
Expected: FAIL — cannot resolve `./generate`.

- [ ] **Step 3: Implement `src/lib/game/generate.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/game/generate.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Implement `scripts/generate-puzzles.ts`**

```ts
import { argentinaDate } from '../src/lib/game/calendar';
import { planPuzzles } from '../src/lib/game/generate';
import type { PriceDataset, Puzzle } from '../src/lib/game/types';
import { readJsonIfExists, writeJsonAtomic } from './lib/json-file';

const PRICES_PATH = 'data/prices.json';
const PUZZLES_PATH = 'data/puzzles.json';

async function main(): Promise<void> {
  const dataset = await readJsonIfExists<PriceDataset>(PRICES_PATH);
  if (!dataset) throw new Error(`${PRICES_PATH} not found. Run "npm run ingest" first.`);
  const existing = (await readJsonIfExists<Puzzle[]>(PUZZLES_PATH)) ?? [];
  const puzzles = planPuzzles(dataset, existing, argentinaDate(new Date()));
  await writeJsonAtomic(PUZZLES_PATH, puzzles);
  console.log(`Wrote ${puzzles.length} puzzles to ${PUZZLES_PATH} (period ${dataset.latestPeriod}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [ ] **Step 6: Smoke the script against a throwaway dataset** (do not commit `data/`)

```bash
mkdir -p data
node -e "const p=[];for(let i=0;i<40;i++)p.push({code:'P'+i,name:'Producto '+i,unit:'kg',prices:{'202509':1000,'202609':1000*(1+i*2.5/100)}});require('fs').writeFileSync('data/prices.json',JSON.stringify({source:'smoke',fetchedAt:'x',latestPeriod:'202609',products:p}))"
npm run generate
rm -rf data
```

Expected: `Wrote N puzzles to data/puzzles.json (period 202609).` with N ≥ 60.

- [ ] **Step 7: Run full unit suite and commit**

Run: `npm test` → Expected: PASS.

```bash
git add src/lib/game/generate.ts src/lib/game/generate.test.ts scripts/generate-puzzles.ts
git commit -m "feat: deterministic daily puzzle generator" -- src/lib/game/generate.ts src/lib/game/generate.test.ts scripts/generate-puzzles.ts
```

---

### Task 3: INDEC ingest (API client, normalizer, `ingest` script)

**Files:**
- Create: `src/lib/ingest/indec-client.ts`, `src/lib/ingest/normalize.ts`, `scripts/ingest.ts`
- Test: `src/lib/ingest/indec-client.test.ts`, `src/lib/ingest/normalize.test.ts`
- Uses fixture: `tests/fixtures/indec-precio-promedio-rows.json` (25 real rows from the API: 5 GBA products × periods 202003–202005, 202509, 202609; includes `Galletitas de agua envasadas` 202004 with `valor: null, valor_null: "///"`, and one `Cuyo` row for Cebolla 202609).

**Interfaces:**
- Consumes (Task 1): types from `../game/types`; `shiftPeriod` from `../game/period`; `readJsonIfExists`, `writeJsonAtomic` from `scripts/lib/json-file.ts`.
- Produces:
  - `indec-client.ts`: `INDEC_BASE_URL`, `IPC_PRIMARY_KEY`, `PAGE_SIZE = 1000`, `class IngestError extends Error`, `indecRowSchema`, `type IndecRow`, `parseTotal(header: string | null): number`, `fetchPrecioPromedioRows(token: string, fetchImpl?: typeof fetch): Promise<IndecRow[]>`.
  - `normalize.ts`: `DATASET_SOURCE`, `MIN_COMPARABLE_PRODUCTS = 30`, `normalizeRows(rows: IndecRow[], fetchedAt: string): PriceDataset`, `countComparableProducts(dataset: PriceDataset): number`, `datasetsEqual(a: PriceDataset, b: PriceDataset): boolean`.
  - `npm run ingest` writes `data/prices.json` (only if data changed; never on failure).

- [ ] **Step 1: Write failing tests `src/lib/ingest/normalize.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import rows from '../../../tests/fixtures/indec-precio-promedio-rows.json';
import type { IndecRow } from './indec-client';
import { countComparableProducts, datasetsEqual, normalizeRows } from './normalize';

const fixture = rows as IndecRow[];
const dataset = normalizeRows(fixture, '2026-11-02T18:00:00Z');
const byName = (name: string) => dataset.products.find((p) => p.name === name)!;

describe('normalizeRows', () => {
  it('keeps GBA rows only', () => {
    expect(byName('Cebolla').prices['202609']).toBe(2696.23);
    expect(byName('Cebolla').prices['202509']).toBe(753.4);
  });

  it('drops rows carrying a null marker instead of a value', () => {
    const galletitas = byName('Galletitas de agua envasadas');
    expect(Object.keys(galletitas.prices)).toEqual(['202003', '202005', '202509', '202609']);
  });

  it('derives the unit from the indicator description', () => {
    expect(byName('Cebolla').unit).toBe('kg');
    expect(byName('Huevos de gallina').unit).toBe('Docena');
  });

  it('reports the latest period and comparable products', () => {
    expect(dataset.latestPeriod).toBe('202609');
    expect(dataset.products).toHaveLength(5);
    expect(countComparableProducts(dataset)).toBe(5);
  });

  it('fails when no usable rows exist', () => {
    expect(() => normalizeRows(fixture.filter((r) => r.region !== 'GBA'), 'x')).toThrow('No usable');
  });
});

describe('datasetsEqual', () => {
  it('ignores fetchedAt but not prices', () => {
    const later = normalizeRows(fixture, '2026-11-03T18:00:00Z');
    expect(datasetsEqual(dataset, later)).toBe(true);
    const changed = structuredClone(later);
    changed.products[0].prices['202609'] += 1;
    expect(datasetsEqual(dataset, changed)).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing tests `src/lib/ingest/indec-client.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import rows from '../../../tests/fixtures/indec-precio-promedio-rows.json';
import { IngestError, PAGE_SIZE, fetchPrecioPromedioRows, parseTotal } from './indec-client';

type Call = { url: URL; headers: Headers };

function fakeApi(total: number, options: { status?: number; contentRange?: string | null } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, headers: new Headers(init?.headers) });
    if (options.status && options.status >= 400) return new Response('{"message":"JWT expired"}', { status: options.status });
    const offset = Number(url.searchParams.get('offset'));
    const count = Math.max(0, Math.min(PAGE_SIZE, total - offset));
    const page = Array.from({ length: count }, (_, i) => rows[(offset + i) % rows.length]);
    const contentRange = options.contentRange === undefined
      ? (count === 0 ? `*/${total}` : `${offset}-${offset + count - 1}/${total}`)
      : options.contentRange;
    const headers = contentRange === null ? undefined : { 'Content-Range': contentRange };
    return new Response(JSON.stringify(page), { status: count < total ? 206 : 200, headers });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

describe('fetchPrecioPromedioRows', () => {
  it('pages through the full table with auth, count and filters', async () => {
    const api = fakeApi(1500);
    const result = await fetchPrecioPromedioRows('tok', api.fetchImpl);
    expect(result).toHaveLength(1500);
    expect(api.calls.map((c) => c.url.searchParams.get('offset'))).toEqual(['0', '1000']);
    const first = api.calls[0];
    expect(first.url.pathname).toBe('/v1/ipc_nacional');
    expect(first.url.searchParams.get('tipo_de_indicador')).toBe('eq.Precio promedio');
    expect(first.url.searchParams.get('region')).toBe('eq.GBA');
    expect(first.url.searchParams.get('limit')).toBe('1000');
    expect(first.headers.get('Authorization')).toBe('Bearer tok');
    expect(first.headers.get('Prefer')).toBe('count=exact');
  });

  it('returns no rows for an empty table', async () => {
    expect(await fetchPrecioPromedioRows('tok', fakeApi(0).fetchImpl)).toEqual([]);
  });

  it('fails on auth errors', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { status: 401 }).fetchImpl)).rejects.toThrow(/401/);
  });

  it('fails when Content-Range is missing', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { contentRange: null }).fetchImpl)).rejects.toThrow(IngestError);
  });

  it('fails when the row count does not match the reported total', async () => {
    await expect(fetchPrecioPromedioRows('tok', fakeApi(10, { contentRange: '0-9/2000' }).fetchImpl)).rejects.toThrow(/expected 2000/);
  });
});

describe('parseTotal', () => {
  it('reads the total from both range forms', () => {
    expect(parseTotal('0-999/15274')).toBe(15274);
    expect(parseTotal('*/0')).toBe(0);
  });
});
```

Note on the mismatch test: the fake returns 10 rows with total 2000; the client requests offset 1000 next, gets 0 rows, stops, and must throw because it collected 10 ≠ 2000.

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/lib/ingest`
Expected: FAIL — cannot resolve `./normalize` / `./indec-client`.

- [ ] **Step 4: Implement `src/lib/ingest/indec-client.ts`**

```ts
import { z } from 'zod';

export const INDEC_BASE_URL = 'https://api.indec.gob.ar/v1/';
export const IPC_PRIMARY_KEY =
  'clasificador,nivel,codigo,descripcion,periodo,anio,mes,indicador,tipo_de_indicador,tipo_de_indicador_descripcion,region,unidad_de_medida';
export const PAGE_SIZE = 1000;

export class IngestError extends Error {
  override name = 'IngestError';
}

export const indecRowSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  periodo: z.string().regex(/^\d{6}$/),
  tipo_de_indicador: z.string(),
  tipo_de_indicador_descripcion: z.string(),
  region: z.string(),
  valor: z.number().nullable(),
  valor_null: z.string().nullable(),
});
export type IndecRow = z.infer<typeof indecRowSchema>;

const pageSchema = z.array(indecRowSchema);

export function parseTotal(header: string | null): number {
  const match = header?.match(/\/(\d+)$/);
  if (!match) throw new IngestError(`Missing or invalid Content-Range header: ${header}`);
  return Number(match[1]);
}

export async function fetchPrecioPromedioRows(token: string, fetchImpl: typeof fetch = fetch): Promise<IndecRow[]> {
  const rows: IndecRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL('ipc_nacional', INDEC_BASE_URL);
    url.search = new URLSearchParams({
      tipo_de_indicador: 'eq.Precio promedio',
      region: 'eq.GBA',
      order: IPC_PRIMARY_KEY,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    }).toString();

    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'count=exact', Accept: 'application/json' },
    });
    if (response.status !== 200 && response.status !== 206) {
      const body = (await response.text()).slice(0, 200);
      throw new IngestError(`INDEC API responded ${response.status}: ${body}`);
    }

    const total = parseTotal(response.headers.get('Content-Range'));
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new IngestError('INDEC API returned a non-JSON body');
    }
    const page = pageSchema.safeParse(body);
    if (!page.success) throw new IngestError(`Unexpected row shape: ${page.error.message.slice(0, 300)}`);
    rows.push(...page.data);

    if (page.data.length === 0 || offset + PAGE_SIZE >= total) {
      if (rows.length !== total) throw new IngestError(`Got ${rows.length} rows, expected ${total}`);
      return rows;
    }
  }
}
```

- [ ] **Step 5: Implement `src/lib/ingest/normalize.ts`**

```ts
import { shiftPeriod } from '../game/period';
import type { PriceDataset, Product } from '../game/types';
import { IngestError, type IndecRow } from './indec-client';

export const DATASET_SOURCE = 'INDEC API v1 ipc_nacional · Precio promedio · GBA';
export const MIN_COMPARABLE_PRODUCTS = 30;
const UNIT_PREFIX = 'Valor por ';

function unitFrom(description: string): string {
  const trimmed = description.trim();
  return trimmed.startsWith(UNIT_PREFIX) ? trimmed.slice(UNIT_PREFIX.length) : trimmed;
}

export function normalizeRows(rows: IndecRow[], fetchedAt: string): PriceDataset {
  const usable = rows.filter(
    (r) =>
      r.region === 'GBA' &&
      r.tipo_de_indicador === 'Precio promedio' &&
      r.valor_null === null &&
      r.valor !== null &&
      r.valor > 0,
  );
  if (usable.length === 0) throw new IngestError('No usable GBA average-price rows');

  const byCode = new Map<string, IndecRow[]>();
  for (const row of usable) {
    const list = byCode.get(row.codigo) ?? [];
    list.push(row);
    byCode.set(row.codigo, list);
  }

  const products: Product[] = [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, productRows]) => {
      const sorted = [...productRows].sort((a, b) => a.periodo.localeCompare(b.periodo));
      const latest = sorted[sorted.length - 1];
      return {
        code,
        name: latest.descripcion.trim(),
        unit: unitFrom(latest.tipo_de_indicador_descripcion),
        prices: Object.fromEntries(sorted.map((r) => [r.periodo, r.valor as number])),
      };
    });

  const latestPeriod = usable.reduce((max, r) => (r.periodo > max ? r.periodo : max), usable[0].periodo);
  return { source: DATASET_SOURCE, fetchedAt, latestPeriod, products };
}

/** Products with a price at the latest period and 12 months before (i.e. usable in a puzzle). */
export function countComparableProducts(dataset: PriceDataset): number {
  const base = shiftPeriod(dataset.latestPeriod, -12);
  return dataset.products.filter(
    (p) => p.prices[dataset.latestPeriod] !== undefined && p.prices[base] !== undefined,
  ).length;
}

export function datasetsEqual(a: PriceDataset, b: PriceDataset): boolean {
  return JSON.stringify({ ...a, fetchedAt: '' }) === JSON.stringify({ ...b, fetchedAt: '' });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/ingest`
Expected: PASS.

- [ ] **Step 7: Implement `scripts/ingest.ts`**

```ts
import type { PriceDataset } from '../src/lib/game/types';
import { IngestError, fetchPrecioPromedioRows } from '../src/lib/ingest/indec-client';
import {
  MIN_COMPARABLE_PRODUCTS,
  countComparableProducts,
  datasetsEqual,
  normalizeRows,
} from '../src/lib/ingest/normalize';
import { readJsonIfExists, writeJsonAtomic } from './lib/json-file';

const PRICES_PATH = 'data/prices.json';

async function main(): Promise<void> {
  const token = process.env.INDEC_API_TOKEN;
  if (!token) throw new IngestError('INDEC_API_TOKEN is not set (use .env.local locally or a CI secret).');

  const rows = await fetchPrecioPromedioRows(token);
  const dataset = normalizeRows(rows, new Date().toISOString());
  const comparable = countComparableProducts(dataset);
  if (comparable < MIN_COMPARABLE_PRODUCTS) {
    throw new IngestError(
      `Only ${comparable} products comparable for ${dataset.latestPeriod} (minimum ${MIN_COMPARABLE_PRODUCTS}).`,
    );
  }

  const previous = await readJsonIfExists<PriceDataset>(PRICES_PATH);
  if (previous && datasetsEqual(previous, dataset)) {
    console.log(`No changes (latest period ${dataset.latestPeriod}).`);
    return;
  }
  await writeJsonAtomic(PRICES_PATH, dataset);
  console.log(
    `Wrote ${dataset.products.length} products (${comparable} comparable), latest period ${dataset.latestPeriod}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof IngestError ? `Ingest failed: ${error.message}` : error);
  process.exit(1);
});
```

- [ ] **Step 8: Smoke the failure path** (no network write expected)

Run: `INDEC_API_TOKEN=invalid node --import tsx scripts/ingest.ts; echo "exit=$?"`
Expected: `Ingest failed: INDEC API responded 401: …` and `exit=1`; `data/prices.json` does not exist afterwards.

Do NOT run the real ingest in this task (Task 5 does it).

- [ ] **Step 9: Run full unit suite and commit**

Run: `npm test` → Expected: PASS.

```bash
git add src/lib/ingest scripts/ingest.ts
git commit -m "feat: INDEC average-price ingest" -- src/lib/ingest scripts/ingest.ts
```

---

### Task 4: Client game logic (share, stats, storage, session, format)

**Files:**
- Create: `src/lib/game/share.ts`, `src/lib/game/stats.ts`, `src/lib/game/storage.ts`, `src/lib/game/session.ts`, `src/lib/game/format.ts`
- Test: `src/lib/game/share.test.ts`, `src/lib/game/stats.test.ts`, `src/lib/game/storage.test.ts`, `src/lib/game/session.test.ts`, `src/lib/game/format.test.ts`

**Interfaces:**
- Consumes (Task 1): `Answer`, `Puzzle`, `Round` from `./types`.
- Produces:
  - `share.ts`: `ROUND_COUNT = 5`, `isValidGrid(grid: string): boolean`, `gridScore(grid: string): number`, `gridToEmoji(grid: string): string`, `gridFromAnswers(rounds: Round[], answers: Answer[]): string`, `resultPath(number: number, grid: string): string`, `shareText(number: number, grid: string, siteUrl: string): string`, `parseResultParams(numberParam: string, gridParam: string, maxNumber: number): { number: number; grid: string } | null`.
  - `stats.ts`: `interface Stats { played: number; distribution: number[]; currentStreak: number; maxStreak: number }`, `computeStats(history: Record<string, string>, todayNumber: number): Stats` (streak = consecutive puzzle numbers completed; current streak counts back from today, or from yesterday if today is not completed yet).
  - `storage.ts`: `STORAGE_KEY = 'que-subio-mas:v1'`, `interface SavedState { version: 1; progress: { number: number; answers: Answer[] } | null; history: Record<string, string> }`, `emptyState(): SavedState`, `getBrowserStorage(): Storage | null`, `loadState(storage: Storage | null): SavedState`, `saveState(storage: Storage | null, state: SavedState): void`.
  - `session.ts`: `answersFor(state: SavedState, puzzleNumber: number): Answer[]`, `recordAnswer(state: SavedState, puzzle: Puzzle, answer: Answer): SavedState`.
  - `format.ts`: `formatPrice(value: number): string` (`$2.696,23`), `formatYoy(value: number): string` (`+257,9%`, `-1,2%`, `0,0%`).

- [ ] **Step 1: Write failing tests `src/lib/game/share.test.ts`**

```ts
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
```

- [ ] **Step 2: Write failing tests `src/lib/game/stats.test.ts`**

```ts
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
```

- [ ] **Step 3: Write failing tests `src/lib/game/storage.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, emptyState, loadState, saveState, type SavedState } from './storage';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('storage', () => {
  it('round-trips saved state', () => {
    const storage = new MemoryStorage();
    const state: SavedState = { version: 1, progress: { number: 3, answers: ['a', 'b'] }, history: { '2': '10101' } };
    saveState(storage, state);
    expect(loadState(storage)).toEqual(state);
  });

  it('starts clean on invalid JSON or another version', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadState(storage)).toEqual(emptyState());
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, progress: null, history: {} }));
    expect(loadState(storage)).toEqual(emptyState());
  });

  it('drops invalid history entries and invalid progress', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, progress: { number: 3, answers: ['a', 'c'] }, history: { '1': '11111', '2': 'abc', x: '11111' } }),
    );
    expect(loadState(storage)).toEqual({ version: 1, progress: null, history: { '1': '11111' } });
  });

  it('works without storage', () => {
    expect(loadState(null)).toEqual(emptyState());
  });
});
```

- [ ] **Step 4: Write failing tests `src/lib/game/session.test.ts`**

```ts
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
```

- [ ] **Step 5: Write failing tests `src/lib/game/format.test.ts`**

```ts
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
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/lib/game/share.test.ts src/lib/game/stats.test.ts src/lib/game/storage.test.ts src/lib/game/session.test.ts src/lib/game/format.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 7: Implement `src/lib/game/share.ts`**

```ts
import type { Answer, Round } from './types';

export const ROUND_COUNT = 5;
const GRID_PATTERN = /^[01]{5}$/;
const NUMBER_PATTERN = /^[1-9]\d*$/;

export function isValidGrid(grid: string): boolean {
  return GRID_PATTERN.test(grid);
}

export function gridScore(grid: string): number {
  return [...grid].filter((c) => c === '1').length;
}

export function gridToEmoji(grid: string): string {
  return [...grid].map((c) => (c === '1' ? '🟩' : '🟥')).join('');
}

export function gridFromAnswers(rounds: Round[], answers: Answer[]): string {
  return answers.map((answer, i) => (answer === rounds[i].answer ? '1' : '0')).join('');
}

export function resultPath(number: number, grid: string): string {
  return `/r/${number}/${grid}`;
}

export function shareText(number: number, grid: string, siteUrl: string): string {
  const url = `${siteUrl.replace(/\/+$/, '')}${resultPath(number, grid)}`;
  return `¿Qué subió más? #${number} ${gridScore(grid)}/${ROUND_COUNT}\n${gridToEmoji(grid)}\n${url}`;
}

export function parseResultParams(
  numberParam: string,
  gridParam: string,
  maxNumber: number,
): { number: number; grid: string } | null {
  if (!NUMBER_PATTERN.test(numberParam) || !isValidGrid(gridParam)) return null;
  const number = Number(numberParam);
  return number <= maxNumber ? { number, grid: gridParam } : null;
}
```

- [ ] **Step 8: Implement `src/lib/game/stats.ts`**

```ts
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
```

- [ ] **Step 9: Implement `src/lib/game/storage.ts`**

```ts
import { isValidGrid, ROUND_COUNT } from './share';
import type { Answer } from './types';

export const STORAGE_KEY = 'que-subio-mas:v1';

export interface SavedState {
  version: 1;
  progress: { number: number; answers: Answer[] } | null;
  /** Puzzle number (as string) → result grid. */
  history: Record<string, string>;
}

export function emptyState(): SavedState {
  return { version: 1, progress: null, history: {} };
}

export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isPuzzleNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function parseProgress(value: unknown): SavedState['progress'] {
  if (typeof value !== 'object' || value === null) return null;
  const { number, answers } = value as { number?: unknown; answers?: unknown };
  if (!isPuzzleNumber(number) || !Array.isArray(answers) || answers.length > ROUND_COUNT) return null;
  if (!answers.every((a) => a === 'a' || a === 'b')) return null;
  return { number, answers: answers as Answer[] };
}

function parseHistory(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, grid]) => /^[1-9]\d*$/.test(key) && typeof grid === 'string' && isValidGrid(grid),
    ),
  );
}

export function loadState(storage: Storage | null): SavedState {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
      return emptyState();
    }
    const { progress, history } = parsed as { progress?: unknown; history?: unknown };
    return { version: 1, progress: parseProgress(progress), history: parseHistory(history) };
  } catch {
    return emptyState();
  }
}

export function saveState(storage: Storage | null, state: SavedState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage revoked: the game keeps working in memory.
  }
}
```

- [ ] **Step 10: Implement `src/lib/game/session.ts`**

```ts
import { ROUND_COUNT, gridFromAnswers } from './share';
import type { SavedState } from './storage';
import type { Answer, Puzzle } from './types';

export function answersFor(state: SavedState, puzzleNumber: number): Answer[] {
  return state.progress?.number === puzzleNumber ? state.progress.answers : [];
}

/** Returns the next state after answering the current round; unchanged state if the puzzle is already done. */
export function recordAnswer(state: SavedState, puzzle: Puzzle, answer: Answer): SavedState {
  const key = String(puzzle.number);
  const answers = answersFor(state, puzzle.number);
  if (state.history[key] !== undefined || answers.length >= ROUND_COUNT) return state;

  const nextAnswers = [...answers, answer];
  const history =
    nextAnswers.length === ROUND_COUNT
      ? { ...state.history, [key]: gridFromAnswers(puzzle.rounds, nextAnswers) }
      : state.history;
  return { ...state, progress: { number: puzzle.number, answers: nextAnswers }, history };
}
```

- [ ] **Step 11: Implement `src/lib/game/format.ts`**

```ts
const priceFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});
const percentFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  useGrouping: 'always',
});

export function formatPrice(value: number): string {
  return `$${priceFormatter.format(value)}`;
}

export function formatYoy(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${percentFormatter.format(Math.abs(value))}%`;
}
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npx vitest run src/lib/game/share.test.ts src/lib/game/stats.test.ts src/lib/game/storage.test.ts src/lib/game/session.test.ts src/lib/game/format.test.ts`
Expected: PASS.

- [ ] **Step 13: Run full unit suite and commit**

Run: `npm test` → Expected: PASS.

```bash
FILES="src/lib/game/share.ts src/lib/game/share.test.ts src/lib/game/stats.ts src/lib/game/stats.test.ts src/lib/game/storage.ts src/lib/game/storage.test.ts src/lib/game/session.ts src/lib/game/session.test.ts src/lib/game/format.ts src/lib/game/format.test.ts"
git add $FILES
git commit -m "feat: client game logic (share, stats, storage, session, format)" -- $FILES
```

---

### Task 5: Real data and puzzle selection

**Files:**
- Create: `data/prices.json`, `data/puzzles.json` (generated), `src/lib/game/select.ts`, `src/lib/data/puzzles.ts`, `src/lib/site.ts`
- Test: `src/lib/game/select.test.ts`

**Interfaces:**
- Consumes: `npm run data` (Tasks 2 and 3), `argentinaDate`, `puzzleNumberForDate` (Task 1), `Puzzle` type.
- Produces:
  - `select.ts`: `interface PuzzleSelection { puzzle: Puzzle; spare: boolean }`, `selectPuzzle(puzzles: readonly Puzzle[], isoDate: string): PuzzleSelection` — exact match by number; before launch (number < 1) returns puzzle #1 with `spare: false`; no puzzle for that number returns the last puzzle with `spare: true`; empty list throws.
  - `src/lib/data/puzzles.ts`: `getTodayPuzzle(now?: Date): PuzzleSelection`, `getTodayNumber(now?: Date): number` (= `max(1, puzzleNumberForDate(argentinaDate(now)))`).
  - `src/lib/site.ts`: `getSiteUrl(): string` — `NEXT_PUBLIC_SITE_URL` without trailing slash, default `http://localhost:3000`.

- [ ] **Step 1: Run the real ingest + generation**

Run: `npm run data`
Expected: `Wrote 59 products (≥30 comparable), latest period 2026MM.` followed by `Wrote N puzzles to data/puzzles.json (period 2026MM).` Then check:

```bash
node -e "const p=require('./data/prices.json');const z=require('./data/puzzles.json');console.log(p.products.length,p.latestPeriod,z.length,z[0].number,z[0].date,z[0].rounds.map(r=>r.a.name+' vs '+r.b.name+' '+r.a.yoy+'/'+r.b.yoy))"
```

Expected: 59 products, latest period ≥ `202609`, ≥ 60 puzzles, first puzzle `#1` dated `2026-11-03`, five rounds with readable product names.

- [ ] **Step 2: Write failing test `src/lib/game/select.test.ts`**

```ts
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/lib/game/select.test.ts` → Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/game/select.ts`**

```ts
import { puzzleNumberForDate } from './calendar';
import type { Puzzle } from './types';

export interface PuzzleSelection {
  puzzle: Puzzle;
  /** True when no puzzle exists for the day and the last available one is shown instead. */
  spare: boolean;
}

export function selectPuzzle(puzzles: readonly Puzzle[], isoDate: string): PuzzleSelection {
  if (puzzles.length === 0) throw new Error('No puzzles available');
  const number = Math.max(1, puzzleNumberForDate(isoDate));
  const exact = puzzles.find((p) => p.number === number);
  return exact ? { puzzle: exact, spare: false } : { puzzle: puzzles[puzzles.length - 1], spare: true };
}
```

- [ ] **Step 5: Implement `src/lib/data/puzzles.ts` and `src/lib/site.ts`**

```ts
// src/lib/data/puzzles.ts
import puzzlesJson from '../../../data/puzzles.json';
import { argentinaDate, puzzleNumberForDate } from '../game/calendar';
import { selectPuzzle, type PuzzleSelection } from '../game/select';
import type { Puzzle } from '../game/types';

const PUZZLES = puzzlesJson as Puzzle[];

export function getTodayPuzzle(now: Date = new Date()): PuzzleSelection {
  return selectPuzzle(PUZZLES, argentinaDate(now));
}

export function getTodayNumber(now: Date = new Date()): number {
  return Math.max(1, puzzleNumberForDate(argentinaDate(now)));
}
```

```ts
// src/lib/site.ts
const DEFAULT_SITE_URL = 'http://localhost:3000';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}
```

- [ ] **Step 6: Run tests, typecheck and commit**

Run: `npm test` → PASS. Run: `npx tsc --noEmit` → no errors.

```bash
FILES="data/prices.json data/puzzles.json src/lib/game/select.ts src/lib/game/select.test.ts src/lib/data/puzzles.ts src/lib/site.ts"
git add $FILES
git commit -m "feat: real INDEC data and daily puzzle selection" -- $FILES
```

---

### Task 6: Game UI

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/components/game/Game.tsx`, `src/components/game/RoundCard.tsx`, `src/components/game/ResultPanel.tsx`, `src/components/game/StatsDialog.tsx`, `src/components/game/RulesDialog.tsx`, `src/components/game/Countdown.tsx`, `src/components/game/AnimatedPercent.tsx`
- Delete: scaffold assets in `public/` that are no longer referenced (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`).

**Interfaces:**
- Consumes: `getTodayPuzzle` (`@/lib/data/puzzles`), `getSiteUrl` (`@/lib/site`), `argentinaDate`, `puzzleNumberForDate`, `msUntilNextPuzzle` (`@/lib/game/calendar`), `shiftPeriod`, `formatPeriod` (`@/lib/game/period`), `answersFor`, `recordAnswer` (`@/lib/game/session`), `getBrowserStorage`, `loadState`, `saveState`, `SavedState` (`@/lib/game/storage`), `computeStats` (`@/lib/game/stats`), `shareText`, `gridScore`, `gridToEmoji`, `ROUND_COUNT` (`@/lib/game/share`), `formatPrice`, `formatYoy` (`@/lib/game/format`).
- Produces: the DOM contract below (Task 8's e2e depends on it verbatim):
  - Round header text `Ronda {i} de 5`.
  - Option buttons: `data-testid="option-a"` / `data-testid="option-b"`, accessible name starts with the product name; after answering, both are disabled and carry `data-result="correct"` (the right answer) / `data-result="wrong"` (chosen wrong option) / no attribute.
  - Advance button: `Siguiente` for rounds 1–4, `Ver resultado` after round 5.
  - Final panel: `data-testid="final-score"` with text `{score}/5`; `data-testid="share-text"` element (`<pre>`) whose text is exactly `shareText(number, grid, siteUrl)`; button `Compartir`; after copying, visible text `¡Copiado!`.
  - Header icon buttons with `aria-label="Reglas"` and `aria-label="Estadísticas"`.
  - Spare banner containing `Puzzle de repuesto` when `spare` is true.

**Design:** Before writing any markup, read `skill://design-taste-frontend` and follow it. Direction: editorial "economic ticker" — off-white paper background, near-black ink, one accent; big tabular numerals for prices and percentages; correct = green, wrong = red (match the 🟩/🟥 share grid). Mobile-first (designed at 390×844, comfortable at 1280×800), WCAG AA contrast, visible focus rings, full keyboard play (Tab/Enter/Space), `prefers-reduced-motion` disables count-up and transitions. Fonts via `next/font/google`. No emoji in UI chrome except the result grid.

**Copy (exact, Spanish):**
- Title: `¿Qué subió más?`; subtitle: `#{number} · Precios promedio en GBA · INDEC`.
- Question: `¿Cuál aumentó más entre {formatPeriod(base)} y {formatPeriod(period)}?` where `base = shiftPeriod(period, -12)`.
- Card before reveal: product name, `por {unit}`. After reveal: `{formatPrice(from)} → {formatPrice(to)}` and `formatYoy(yoy)`.
- Rules dialog: `Cada día hay 5 rondas. En cada una elegí el producto cuyo precio promedio aumentó más en los últimos 12 meses. Las rondas se ponen más difíciles. Datos oficiales del INDEC (precios promedio, Gran Buenos Aires). Hay un puzzle nuevo cada día a las 00:00 (hora argentina).`
- Stats dialog labels: `Jugados`, `Racha actual`, `Mejor racha`, `Distribución` (bars for scores 0–5).
- Final panel: score, emoji grid, share preview, `Compartir`, `Próximo puzzle en HH:MM:SS`, source line `Fuente: INDEC, API ipc_nacional (precios promedio GBA).`
- Spare banner: `Puzzle de repuesto: todavía no hay un puzzle nuevo para hoy.`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { Game } from '@/components/game/Game';
import { getTodayPuzzle } from '@/lib/data/puzzles';
import { getSiteUrl } from '@/lib/site';

// Re-render at most once a minute so the daily puzzle flips shortly after Argentina midnight.
export const revalidate = 60;

export default function Home() {
  const { puzzle, spare } = getTodayPuzzle();
  return <Game puzzle={puzzle} spare={spare} siteUrl={getSiteUrl()} />;
}
```

If Next 16 rejects `export const revalidate` (check the bundled docs under `node_modules/next/dist/docs/` if present, otherwise nextjs.org docs for the installed version), use that version's documented equivalent for time-based revalidation of a page, keeping 60 seconds.

- [ ] **Step 2: Update `src/app/layout.tsx`** — `<html lang="es-AR">`, fonts, and metadata:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: '¿Qué subió más? — el juego diario de precios del INDEC',
  description: 'Cada día, 5 rondas: adiviná qué producto aumentó más en el último año. Datos oficiales del INDEC.',
};
```

- [ ] **Step 3: Implement `src/components/game/Game.tsx`** (client component; state logic below is binding, presentation is yours)

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { argentinaDate, puzzleNumberForDate } from '@/lib/game/calendar';
import { answersFor, recordAnswer } from '@/lib/game/session';
import { ROUND_COUNT } from '@/lib/game/share';
import { getBrowserStorage, loadState, saveState, type SavedState } from '@/lib/game/storage';
import type { Answer, Puzzle } from '@/lib/game/types';

interface GameProps {
  puzzle: Puzzle;
  spare: boolean;
  siteUrl: string;
}

export function Game({ puzzle, spare, siteUrl }: GameProps) {
  const router = useRouter();
  const [state, setState] = useState<SavedState | null>(null); // null until localStorage is read (avoids hydration mismatch)
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    setState(loadState(getBrowserStorage()));
  }, []);

  // Cached HTML from before Argentina midnight: fetch the new day's puzzle.
  useEffect(() => {
    if (!spare && puzzleNumberForDate(argentinaDate(new Date())) > puzzle.number) router.refresh();
  }, [puzzle.number, spare, router]);

  const choose = useCallback(
    (answer: Answer) => {
      if (!state || revealing) return;
      const next = recordAnswer(state, puzzle, answer);
      if (next === state) return;
      saveState(getBrowserStorage(), next);
      setState(next);
      setRevealing(true);
    },
    [state, revealing, puzzle],
  );

  if (!state) return /* neutral loading skeleton with the page chrome */ null;

  const answers = answersFor(state, puzzle.number);
  const grid = state.history[String(puzzle.number)];
  const finished = grid !== undefined && !revealing;
  const roundIndex = revealing ? answers.length - 1 : Math.min(answers.length, ROUND_COUNT - 1);
  const advanceLabel = answers.length === ROUND_COUNT ? 'Ver resultado' : 'Siguiente';

  // Render: header (Reglas / Estadísticas), spare banner, then either
  //   <ResultPanel puzzle grid siteUrl onCountdownEnd={() => router.refresh()} /> when finished, or
  //   "Ronda {roundIndex + 1} de 5", the question, two <RoundCard>s for puzzle.rounds[roundIndex]
  //   (revealed = revealing, chosen = answers[roundIndex], onChoose = choose),
  //   and when revealing an advance button labelled advanceLabel with onClick={() => setRevealing(false)}.
  // ...
}
```

The remaining components are presentational: `RoundCard` (option button + reveal with `AnimatedPercent`), `ResultPanel` (score, emoji grid, `<pre data-testid="share-text">`, Compartir, `Countdown`), `StatsDialog` (uses `computeStats(state.history, puzzleNumberForDate(argentinaDate(new Date())))`), `RulesDialog`, `Countdown` (ticks every second from `msUntilNextPuzzle(new Date())`, calls `onEnd` at 0), `AnimatedPercent` (count-up ~600 ms; instant when `prefers-reduced-motion: reduce`). Use native `<dialog>` for dialogs.

Share button behaviour: if `navigator.share` exists and `matchMedia('(pointer: coarse)').matches`, call `navigator.share({ text })` and ignore `AbortError`; otherwise `await navigator.clipboard.writeText(text)` and show `¡Copiado!` for 2 s. If both fail, select the `<pre>` text so the user can copy manually.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev` (port 3000). Play a full game at 390×844 and at 1280×800: choose options with mouse and with keyboard, check reveal, advance, final panel, share preview text, `Compartir` → `¡Copiado!`, reload mid-game (resumes at the next unanswered round), reload after finishing (final panel), Estadísticas and Reglas dialogs, Esc closes dialogs. Save screenshots of round view, reveal, and final panel at both sizes into the SDD workspace directory given in your dispatch, and list them in your report. Stop the dev server.

- [ ] **Step 5: Lint, typecheck, test, build**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build` → all succeed; `/` is listed as a revalidating (ISR) route in the build output.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components public
git commit -m "feat: daily game UI"
```

---

### Task 7: Share pages and OG images

**Files:**
- Create: `src/app/r/[number]/[grid]/page.tsx`, `src/app/api/og/route.tsx`, `src/app/opengraph-image.tsx`

**Interfaces:**
- Consumes: `parseResultParams`, `gridScore`, `gridToEmoji`, `ROUND_COUNT` (`@/lib/game/share`), `getTodayNumber` (`@/lib/data/puzzles`), `getSiteUrl` (`@/lib/site`). Root layout (Task 6) sets `metadataBase`.
- Produces:
  - `GET /r/{n}/{grid}`: valid (per `parseResultParams(n, grid, getTodayNumber())`) → page with `og:image` = `{siteUrl}/api/og?n={n}&g={grid}`, `twitter:card` = `summary_large_image`, title `¿Qué subió más? #{n} — {score}/5`; invalid → `notFound()` (HTTP 404). Rendered dynamically (today's number changes daily).
  - `GET /api/og?n={n}&g={grid}`: valid → `image/png` 1200×630; invalid or missing → HTTP 400 plain text `Parámetros inválidos`.
  - `/opengraph-image`: static 1200×630 brand image for the home page (title + tagline `Adiviná qué producto aumentó más. Datos del INDEC.`).

- [ ] **Step 1: Implement `src/app/api/og/route.tsx`**

```tsx
import { ImageResponse } from 'next/og';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, gridScore, parseResultParams } from '@/lib/game/share';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = parseResultParams(searchParams.get('n') ?? '', searchParams.get('g') ?? '', getTodayNumber());
  if (!params) return new Response('Parámetros inválidos', { status: 400 });

  const cells = [...params.grid];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f3ec', color: '#111', gap: 32 }}>
        <div style={{ fontSize: 72, fontWeight: 800 }}>¿Qué subió más?</div>
        <div style={{ fontSize: 48 }}>{`#${params.number} · ${gridScore(params.grid)}/${ROUND_COUNT}`}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {cells.map((cell, i) => (
            <div key={i} style={{ width: 110, height: 110, borderRadius: 16, background: cell === '1' ? '#1f9d55' : '#d64545' }} />
          ))}
        </div>
        <div style={{ fontSize: 28, color: '#555' }}>Datos: INDEC · precios promedio GBA</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

Match the colours to the palette chosen in Task 6 (read `src/app/globals.css`); keep the structure.

- [ ] **Step 2: Implement `src/app/r/[number]/[grid]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTodayNumber } from '@/lib/data/puzzles';
import { ROUND_COUNT, gridScore, gridToEmoji, parseResultParams } from '@/lib/game/share';
import { getSiteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

type Params = Promise<{ number: string; grid: string }>;

async function resolve(params: Params) {
  const { number, grid } = await params;
  return parseResultParams(number, grid, getTodayNumber());
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const result = await resolve(params);
  if (!result) return {};
  const title = `¿Qué subió más? #${result.number} — ${gridScore(result.grid)}/${ROUND_COUNT}`;
  const image = `${getSiteUrl()}/api/og?n=${result.number}&g=${result.grid}`;
  return {
    title,
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [image] },
  };
}

export default async function SharedResult({ params }: { params: Params }) {
  const result = await resolve(params);
  if (!result) notFound();
  // Render in the visual language of Task 6: title, `#{n}`, `{score}/5`, gridToEmoji(result.grid),
  // and a primary <Link href="/">Jugá el de hoy</Link>.
}
```

If the installed Next version types `params` differently, follow its docs; keep the behaviour.

- [ ] **Step 3: Implement `src/app/opengraph-image.tsx`** with `export const size = { width: 1200, height: 630 }`, `export const contentType = 'image/png'`, `export const alt = '¿Qué subió más?'`, default export returning an `ImageResponse` with the title and tagline in the same palette.

- [ ] **Step 4: Verify against a production build**

```bash
npm run build && (npm run start -- --port 3200 &) && sleep 5
curl -s http://localhost:3200/r/1/11011 | grep -o '<meta property="og:image"[^>]*>'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' 'http://localhost:3200/api/og?n=1&g=11011'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3200/api/og?n=1&g=22222'
for u in /r/0/11111 /r/042/11111 /r/abc/11111 /r/1/2 /r/99999/11111; do curl -s -o /dev/null -w "$u %{http_code}\n" http://localhost:3200$u; done
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:3200/opengraph-image
```

Expected: og:image meta containing `/api/og?n=1&amp;g=11011`; `200 image/png`; `400`; all five bad links `404`; `200 image/png`. Save `/api/og?n=1&g=11011` as a PNG into the SDD workspace and look at it. Stop the server (kill the `next start` process).

- [ ] **Step 5: Lint, typecheck, test, commit**

Run: `npm run lint && npx tsc --noEmit && npm test` → all succeed.

```bash
git add src/app/r src/app/api src/app/opengraph-image.tsx
git commit -m "feat: shareable result pages and OG images" -- src/app/r src/app/api src/app/opengraph-image.tsx
```

---

### Task 8: Data refresh workflow, e2e smoke, README

**Files:**
- Create: `.github/workflows/update-data.yml`, `playwright.config.ts`, `e2e/game.spec.ts`, `README.md`

**Interfaces:**
- Consumes: DOM contract from Task 6; routes from Task 7; `selectPuzzle` (`src/lib/game/select.ts`), `argentinaDate` (`src/lib/game/calendar.ts`), `shareText` (`src/lib/game/share.ts`), `data/puzzles.json`; npm script `data`.
- Produces: `npm run e2e` green; scheduled data refresh.

- [ ] **Step 1: Create `.github/workflows/update-data.yml`**

```yaml
name: Actualizar datos INDEC

on:
  schedule:
    - cron: '0 12 * * *' # 09:00 ART
    - cron: '0 21 * * *' # 18:00 ART
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: update-data
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run data
        env:
          INDEC_API_TOKEN: ${{ secrets.INDEC_API_TOKEN }}
      - name: Commit data changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/
          if git diff --cached --quiet; then
            echo "No data changes"
            exit 0
          fi
          git commit -m "data: actualizar precios y puzzles del INDEC"
          git push
```

Use the newest major versions of `actions/checkout` and `actions/setup-node` that exist at implementation time.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  use: { baseURL: BASE_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    env: { NEXT_PUBLIC_SITE_URL: BASE_URL },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
```

- [ ] **Step 3: Write `e2e/game.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import puzzles from '../data/puzzles.json';
import { argentinaDate } from '../src/lib/game/calendar';
import { selectPuzzle } from '../src/lib/game/select';
import { shareText } from '../src/lib/game/share';
import type { Puzzle } from '../src/lib/game/types';

const BASE_URL = 'http://localhost:3100';
const today = selectPuzzle(puzzles as Puzzle[], argentinaDate(new Date())).puzzle;
const wrongOn = 2; // answer round 3 wrong → grid 11011

async function answerRound(page: import('@playwright/test').Page, index: number) {
  const round = today.rounds[index];
  const pick = index === wrongOn ? (round.answer === 'a' ? 'b' : 'a') : round.answer;
  await expect(page.getByText(`Ronda ${index + 1} de 5`)).toBeVisible();
  await page.getByTestId(`option-${pick}`).click();
  await page.getByRole('button', { name: index === 4 ? 'Ver resultado' : 'Siguiente' }).click();
}

test('plays the daily puzzle, shares, and keeps the result after reload', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  for (let i = 0; i < 5; i++) await answerRound(page, i);

  const expected = shareText(today.number, '11011', BASE_URL);
  await expect(page.getByTestId('final-score')).toHaveText('4/5');
  await expect(page.getByTestId('share-text')).toHaveText(expected);
  await page.getByRole('button', { name: 'Compartir' }).click();
  await expect(page.getByText('¡Copiado!')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);

  await page.reload();
  await expect(page.getByTestId('final-score')).toHaveText('4/5');
});

test('resumes at the next unanswered round after reload', async ({ page }) => {
  await page.goto('/');
  await answerRound(page, 0);
  await answerRound(page, 1);
  await page.reload();
  await expect(page.getByText('Ronda 3 de 5')).toBeVisible();
});

test('shared result page advertises the OG image', async ({ request }) => {
  const html = await (await request.get('/r/1/11011')).text();
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/api\/og\?n=1&amp;g=11011"/);
  const image = await request.get('/api/og?n=1&g=11011');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
});

test('rejects hand-edited share links', async ({ request }) => {
  for (const path of ['/r/0/11111', '/r/042/11111', '/r/abc/11111', '/r/1/2', '/r/99999/11111']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get('/api/og?n=1&g=22222')).status()).toBe(400);
});
```

- [ ] **Step 4: Run e2e**

Run: `npx playwright install chromium && npm run e2e`
Expected: 4 passed. If a test fails because the UI deviates from the Task 6 DOM contract, report it (BLOCKED with the exact mismatch) instead of loosening the test.

- [ ] **Step 5: Write `README.md`** (Spanish) covering: what the game is; data source (endpoint, filters, attribution "Fuente: INDEC"); setup (`npm install`, `.env.local` with `INDEC_API_TOKEN` and `NEXT_PUBLIC_SITE_URL`); scripts (`dev`, `data`, `ingest`, `generate`, `test`, `e2e`, `build`); how puzzles are generated and frozen (bands, epoch 2026-11-03, 60-day horizon); GitHub Action schedule and the `INDEC_API_TOKEN` repo secret (token expires 2027-05-03 — renew before then); deploy to Vercel (import repo, set `NEXT_PUBLIC_SITE_URL`; each data commit redeploys).

- [ ] **Step 6: Lint, test, commit**

Run: `npm run lint && npm test` → succeed.

```bash
git add .github playwright.config.ts e2e README.md
git commit -m "chore: data refresh workflow, e2e smoke and README"
```
