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
