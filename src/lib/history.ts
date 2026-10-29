/**
 * F-09 (SHOULD): last analyses kept in the browser (localStorage).
 * Stored data is treated as untrusted and re-validated with Zod on read.
 */

import { z } from 'zod';
import { AnalysisMetaSchema, PdfAnalysisResultSchema } from './schema';

export const HISTORY_KEY = 'pdf-insight:history:v1';
export const HISTORY_LIMIT = 5;

export const HistoryEntrySchema = z.object({
  id: z.string(),
  analyzedAt: z.string(),
  result: PdfAnalysisResultSchema,
  meta: AnalysisMetaSchema.optional(),
  emptyPages: z.array(z.number().int()).default([]),
  ocrPages: z.array(z.number().int()).default([]),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Funkcja zwraca magazyn localStorage przeglądarki.
 * W trybie prywatnym lub poza przeglądarką funkcja zwraca null.
 * Funkcja nie zgłasza wyjątku.
 *
 * Wejście: brak.
 * Wyjście: obiekt magazynu albo null (StorageLike | null).
 */
function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // e.g. blocked third-party storage / private mode
  }
}

/**
 * Funkcja odczytuje historię analiz z magazynu (F-09).
 * Funkcja traktuje zapisane dane jako niezaufane.
 * Funkcja sprawdza każdy wpis schematem Zod i pomija błędne wpisy.
 * Funkcja zwraca maks. HISTORY_LIMIT (5) wpisów.
 * Przy uszkodzonym JSON funkcja zwraca pustą listę.
 *
 * Wejście: storage – magazyn danych, domyślnie localStorage (StorageLike | null).
 * Wyjście: lista wpisów, najnowszy pierwszy (HistoryEntry[]).
 */
export function loadHistory(storage: StorageLike | null = defaultStorage()): HistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => HistoryEntrySchema.safeParse(item))
      .flatMap((r) => (r.success ? [r.data] : []))
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Funkcja zapisuje nowy wpis na początku historii (F-09).
 * Funkcja usuwa stary wpis o tym samym id.
 * Funkcja zachowuje maks. HISTORY_LIMIT (5) wpisów.
 * Gdy magazyn jest pełny, funkcja pomija zapis i nie zgłasza wyjątku.
 *
 * Wejście:
 *   - entry – nowy wpis historii (HistoryEntry),
 *   - storage – magazyn danych, domyślnie localStorage (StorageLike | null).
 * Wyjście: nowa lista wpisów (HistoryEntry[]).
 */
export function saveToHistory(
  entry: HistoryEntry,
  storage: StorageLike | null = defaultStorage(),
): HistoryEntry[] {
  const next = [entry, ...loadHistory(storage).filter((e) => e.id !== entry.id)].slice(
    0,
    HISTORY_LIMIT,
  );
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded – history is a nice-to-have, ignore
  }
  return next;
}

/**
 * Funkcja usuwa całą historię analiz z magazynu.
 * Funkcja nie zgłasza wyjątku.
 *
 * Wejście: storage – magazyn danych, domyślnie localStorage (StorageLike | null).
 * Wyjście: brak (void).
 */
export function clearHistory(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Funkcja tworzy unikalny identyfikator wpisu historii.
 * Funkcja używa crypto.randomUUID().
 * Gdy ta metoda nie istnieje, funkcja łączy czas i liczbę losową.
 *
 * Wejście: brak.
 * Wyjście: identyfikator (string).
 */
export function createHistoryId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
