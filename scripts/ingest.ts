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
