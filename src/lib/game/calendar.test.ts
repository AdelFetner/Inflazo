import { describe, expect, it } from 'vitest';
import { argentinaDate, dateForPuzzleNumber, formatPuzzleDay, msUntilNextPuzzle, puzzleNumberForDate } from './calendar';

describe('argentinaDate', () => {
  it('uses the Argentina calendar day, not UTC', () => {
    expect(argentinaDate(new Date('2026-11-03T02:59:59Z'))).toBe('2026-11-02');
    expect(argentinaDate(new Date('2026-11-03T03:00:00Z'))).toBe('2026-11-03');
  });
});

describe('formatPuzzleDay', () => {
  it('names the stored calendar day, never the day before', () => {
    // A local-time formatter in UTC−3 would print "31 de diciembre" for this date.
    expect(formatPuzzleDay('2027-01-01')).toBe('1 de enero');
    expect(formatPuzzleDay('2026-11-03')).toBe('3 de noviembre');
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
