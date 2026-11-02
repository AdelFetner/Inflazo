import { describe, expect, it } from 'vitest';
import rows from '../../../tests/fixtures/indec-precio-promedio-rows.json';
import type { IndecRow } from './indec-client';
import { countComparableProducts, datasetsEqual, normalizeRows } from './normalize';

const fixture = rows as IndecRow[];
const dataset = normalizeRows(fixture, '2026-11-02T18:00:00Z');
const byName = (name: string) => dataset.products.find((p) => p.name === name)!;
const cebollaGba = fixture.find((r) => r.descripcion.trim() === 'Cebolla' && r.periodo === '202609')!;
const cuyoRows: IndecRow[] = [{ ...cebollaGba, region: 'Cuyo', valor: 9999.99 }];

describe('normalizeRows', () => {
  it('keeps GBA rows only', () => {
    const mixed = normalizeRows([...fixture, ...cuyoRows], '2026-11-02T18:00:00Z');
    const cebolla = mixed.products.find((p) => p.name === 'Cebolla')!;
    expect(cebolla.prices['202609']).toBe(2696.23);
    expect(cebolla.prices['202509']).toBe(753.4);
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
    expect(() => normalizeRows(cuyoRows, 'x')).toThrow('No usable');
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
