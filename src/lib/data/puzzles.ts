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

export function getPuzzle(number: number): Puzzle | undefined {
  return PUZZLES.find((p) => p.number === number);
}
