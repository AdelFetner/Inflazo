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
