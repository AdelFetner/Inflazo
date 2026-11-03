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

// Puzzle dates are calendar days stored as UTC midnight, so they are formatted in UTC.
const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** `2026-11-03` → `3 de noviembre`. */
export function formatPuzzleDay(isoDate: string): string {
  return dayFormatter.format(isoDateToUtcMs(isoDate));
}

export function msUntilNextPuzzle(now: Date): number {
  const nextMidnightUtcMs = isoDateToUtcMs(argentinaDate(now)) + DAY_MS - ARGENTINA_UTC_OFFSET_MS;
  return nextMidnightUtcMs - now.getTime();
}
