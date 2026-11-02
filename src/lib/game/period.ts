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
