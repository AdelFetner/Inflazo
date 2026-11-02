import { isValidGrid, ROUND_COUNT } from './share';
import type { Answer } from './types';

export const STORAGE_KEY = 'que-subio-mas:v1';

export interface SavedState {
  version: 1;
  progress: { number: number; answers: Answer[] } | null;
  /** Puzzle number (as string) → result grid. */
  history: Record<string, string>;
}

export function emptyState(): SavedState {
  return { version: 1, progress: null, history: {} };
}

export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isPuzzleNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function parseProgress(value: unknown): SavedState['progress'] {
  if (typeof value !== 'object' || value === null) return null;
  const { number, answers } = value as { number?: unknown; answers?: unknown };
  if (!isPuzzleNumber(number) || !Array.isArray(answers) || answers.length > ROUND_COUNT) return null;
  if (!answers.every((a) => a === 'a' || a === 'b')) return null;
  return { number, answers: answers as Answer[] };
}

function parseHistory(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, grid]) => /^[1-9]\d*$/.test(key) && typeof grid === 'string' && isValidGrid(grid),
    ),
  );
}

export function loadState(storage: Storage | null): SavedState {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: unknown }).version !== 1) {
      return emptyState();
    }
    const { progress, history } = parsed as { progress?: unknown; history?: unknown };
    return { version: 1, progress: parseProgress(progress), history: parseHistory(history) };
  } catch {
    return emptyState();
  }
}

export function saveState(storage: Storage | null, state: SavedState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage revoked: the game keeps working in memory.
  }
}
