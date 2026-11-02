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
