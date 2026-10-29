import { describe, it, expect, beforeEach } from 'vitest';
import {
  HISTORY_KEY,
  HISTORY_LIMIT,
  clearHistory,
  loadHistory,
  saveToHistory,
  type HistoryEntry,
} from '../src/lib/history';
import { validResult } from './fixtures';

class MemoryStorage {
  private data = new Map<string, string>();
  /** Funkcja zwraca wartość dla klucza. Wejście: key (string). Wyjście: wartość albo null. */
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  /** Funkcja zapisuje wartość. Wejście: key, value (string). Wyjście: brak. */
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  /** Funkcja usuwa wartość dla klucza. Wejście: key (string). Wyjście: brak. */
  removeItem(key: string) {
    this.data.delete(key);
  }
}

/**
 * Funkcja tworzy testowy wpis historii.
 * Wejście: id – identyfikator wpisu (string).
 * Wyjście: wpis historii z poprawnym wynikiem (HistoryEntry).
 */
const entry = (id: string): HistoryEntry => ({
  id,
  analyzedAt: '2026-10-29T12:00:00.000Z',
  result: validResult,
  emptyPages: [11],
  ocrPages: [],
});

describe('F-09: analysis history in localStorage', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('AUTO-20: saves newest first and keeps at most 5 entries', () => {
    for (let i = 1; i <= 7; i++) saveToHistory(entry(`id-${i}`), storage);
    const history = loadHistory(storage);
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]?.id).toBe('id-7');
  });

  it('AUTO-21: ignores corrupted or tampered entries (re-validated with Zod)', () => {
    storage.setItem(
      HISTORY_KEY,
      JSON.stringify([entry('ok'), { id: 'bad', result: { summary: '<img onerror=alert(1)>' } }]),
    );
    const history = loadHistory(storage);
    expect(history.map((h) => h.id)).toEqual(['ok']);

    storage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory(storage)).toEqual([]);
  });

  it('clears history', () => {
    saveToHistory(entry('a'), storage);
    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
  });

  it('works without storage (private mode)', () => {
    expect(loadHistory(null)).toEqual([]);
    expect(saveToHistory(entry('x'), null)).toHaveLength(1);
  });
});
