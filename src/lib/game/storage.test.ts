import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, emptyState, loadState, saveState, type SavedState } from './storage';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('storage', () => {
  it('round-trips saved state', () => {
    const storage = new MemoryStorage();
    const state: SavedState = { version: 1, progress: { number: 3, answers: ['a', 'b'] }, history: { '2': '10101' } };
    saveState(storage, state);
    expect(loadState(storage)).toEqual(state);
  });

  it('starts clean on invalid JSON or another version', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadState(storage)).toEqual(emptyState());
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, progress: null, history: {} }));
    expect(loadState(storage)).toEqual(emptyState());
  });

  it('drops invalid history entries and invalid progress', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, progress: { number: 3, answers: ['a', 'c'] }, history: { '1': '11111', '2': 'abc', x: '11111' } }),
    );
    expect(loadState(storage)).toEqual({ version: 1, progress: null, history: { '1': '11111' } });
  });

  it('works without storage', () => {
    expect(loadState(null)).toEqual(emptyState());
  });
});
