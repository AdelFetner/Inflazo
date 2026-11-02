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
