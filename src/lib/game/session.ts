import { ROUND_COUNT, gridFromAnswers } from './share';
import type { SavedState } from './storage';
import type { Answer, Puzzle } from './types';

export function answersFor(state: SavedState, puzzleNumber: number): Answer[] {
  return state.progress?.number === puzzleNumber ? state.progress.answers : [];
}

/** Returns the next state after answering the current round; unchanged state if the puzzle is already done. */
export function recordAnswer(state: SavedState, puzzle: Puzzle, answer: Answer): SavedState {
  const key = String(puzzle.number);
  const answers = answersFor(state, puzzle.number);
  if (state.history[key] !== undefined || answers.length >= ROUND_COUNT) return state;

  const nextAnswers = [...answers, answer];
  const history =
    nextAnswers.length === ROUND_COUNT
      ? { ...state.history, [key]: gridFromAnswers(puzzle.rounds, nextAnswers) }
      : state.history;
  return { ...state, progress: { number: puzzle.number, answers: nextAnswers }, history };
}
