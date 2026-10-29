/**
 * F-08 (SHOULD): long documents are split into page-aligned chunks, analysed
 * independently and merged back into a single Section-04 result.
 */

import type { PdfAnalysisResult } from './schema';
import { KEY_POINTS_MAX } from './schema';

/** ~12k tokens of Polish text per chunk – comfortably inside free-tier model context. */
export const DEFAULT_CHUNK_CHARS = 48_000;
export const MAX_CHUNKS = 6;

const PAGE_SPLIT = /(?=^--- Strona \d+ ---$)/m;

/**
 * Funkcja dzieli długi tekst na fragmenty (F-08).
 * Funkcja dzieli tekst na granicach stron (znacznik "--- Strona N ---").
 * Funkcja dodaje całe strony do fragmentu, dopóki fragment nie przekroczy maxChars.
 * Stronę dłuższą niż maxChars funkcja tnie na równe części.
 * Krótki tekst funkcja zwraca jako jeden fragment.
 *
 * Wejście:
 *   - text – tekst dokumentu ze znacznikami stron (string),
 *   - maxChars – maksymalna długość fragmentu, domyślnie 48 000 znaków (number).
 * Wyjście: lista fragmentów (string[]).
 */
export function splitIntoChunks(text: string, maxChars = DEFAULT_CHUNK_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const pages = text.split(PAGE_SPLIT).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = '';

  /**
   * Funkcja zapisuje bieżący fragment na listę chunks i czyści zmienną current.
   * Funkcja pomija pusty fragment.
   * Wejście: brak (funkcja używa zmiennych current i chunks).
   * Wyjście: brak.
   */
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const page of pages) {
    if (page.length > maxChars) {
      flush();
      for (let i = 0; i < page.length; i += maxChars) chunks.push(page.slice(i, i + maxChars));
      continue;
    }
    if (current.length + page.length > maxChars) flush();
    current += page;
  }
  flush();
  return chunks;
}

/**
 * Funkcja usuwa powtórzenia z listy.
 * Funkcja porównuje elementy według klucza z funkcji key.
 * Funkcja zachowuje pierwsze wystąpienie i kolejność elementów.
 *
 * Wejście:
 *   - items – lista elementów (T[]),
 *   - key – funkcja, która zwraca klucz porównania dla elementu.
 * Wyjście: nowa lista bez powtórzeń (T[]).
 */
function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * Funkcja tworzy klucz porównania tekstu.
 * Funkcja usuwa spacje na brzegach, zamienia litery na małe i łączy białe znaki.
 * Dzięki temu "Kwadrat Software S.A." i "kwadrat software s.a." to ten sam klucz.
 *
 * Wejście: s – tekst (string).
 * Wyjście: znormalizowany tekst (string).
 */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Funkcja łączy wyniki fragmentów w jeden wynik zgodny z sekcją 04 (F-08).
 * Metadane dokumentu funkcja bierze z pierwszego fragmentu.
 * Datę dokumentu funkcja bierze z pierwszego fragmentu, który ją zawiera.
 * Encje, kwoty, daty i słowa kluczowe funkcja łączy i usuwa z nich powtórzenia.
 * Daty funkcja sortuje od najstarszej.
 * Podsumowanie i punkty funkcja bierze z kroku łączenia AI (combined).
 * Bez combined funkcja używa podsumowania pierwszego fragmentu i maks. 7 punktów.
 *
 * Wejście:
 *   - parts – wyniki fragmentów, min. 1 element (PdfAnalysisResult[]),
 *   - combined – opcjonalnie wspólne summary i keyPoints z modelu AI.
 * Wyjście: jeden wynik analizy (PdfAnalysisResult).
 * Błędy: Error, gdy lista parts jest pusta.
 */
export function mergeChunkResults(
  parts: readonly PdfAnalysisResult[],
  combined?: Pick<PdfAnalysisResult, 'summary' | 'keyPoints'>,
): PdfAnalysisResult {
  const [first] = parts;
  if (!first) throw new Error('Brak wyników fragmentów do połączenia');

  /**
   * Funkcja zwraca pierwszą wartość różną od null ze wszystkich fragmentów.
   * Wejście: get – funkcja, która odczytuje wartość z wyniku fragmentu.
   * Wyjście: pierwsza wartość różna od null albo null (T | null).
   */
  const pick = <T>(get: (r: PdfAnalysisResult) => T | null): T | null => {
    for (const p of parts) {
      const v = get(p);
      if (v !== null) return v;
    }
    return null;
  };

  return {
    document: { ...first.document, date: pick((r) => r.document.date) },
    summary: combined?.summary ?? first.summary,
    keyPoints: (
      combined?.keyPoints ??
      uniqueBy(
        parts.flatMap((p) => p.keyPoints),
        norm,
      )
    ).slice(0, KEY_POINTS_MAX),
    entities: {
      organizations: uniqueBy(
        parts.flatMap((p) => p.entities.organizations),
        norm,
      ),
      people: uniqueBy(
        parts.flatMap((p) => p.entities.people),
        norm,
      ),
    },
    amounts: uniqueBy(
      parts.flatMap((p) => p.amounts),
      (a) => `${a.value}|${a.currency}|${norm(a.context)}`,
    ),
    dates: uniqueBy(
      parts.flatMap((p) => p.dates),
      (d) => `${d.date}|${norm(d.context)}`,
    ).sort((a, b) => a.date.localeCompare(b.date)),
    keywords: uniqueBy(
      parts.flatMap((p) => p.keywords),
      norm,
    ),
  };
}
