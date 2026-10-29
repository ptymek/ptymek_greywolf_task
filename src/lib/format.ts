const LANGUAGE_NAMES: Record<string, string> = {
  pl: 'polski',
  en: 'angielski',
  de: 'niemiecki',
  fr: 'francuski',
  es: 'hiszpański',
  it: 'włoski',
  cs: 'czeski',
  uk: 'ukraiński',
};

/**
 * Funkcja zamienia kod języka ISO 639-1 na polską nazwę.
 * Dla nieznanego kodu funkcja zwraca sam kod.
 *
 * Wejście: code – kod języka, np. "pl" (string).
 * Wyjście: tekst, np. "polski (pl)" (string).
 */
export function languageLabel(code: string): string {
  return LANGUAGE_NAMES[code] ? `${LANGUAGE_NAMES[code]} (${code})` : code;
}

/**
 * Funkcja formatuje kwotę w polskim formacie waluty.
 * Gdy przeglądarka nie zna kodu waluty, funkcja dodaje kod po liczbie.
 *
 * Wejście:
 *   - value – kwota (number),
 *   - currency – kod waluty ISO 4217, np. "PLN" (string).
 * Wyjście: tekst, np. "184 500,00 zł" (string).
 */
export function formatAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} ${currency}`;
  }
}

/**
 * Funkcja zamienia datę ISO 8601 na polski zapis słowny.
 * Datę w formacie RRRR-MM-DD funkcja traktuje jako czas lokalny.
 * Dla błędnej daty funkcja zwraca tekst wejściowy.
 *
 * Wejście: iso – data ISO 8601, np. "2026-03-12" (string).
 * Wyjście: tekst, np. "12 marca 2026" (string).
 */
export function formatDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Funkcja zamienia datę i czas ISO 8601 na polski format lokalny.
 * Dla błędnej daty funkcja zwraca tekst wejściowy.
 *
 * Wejście: iso – data i czas ISO 8601 (string).
 * Wyjście: tekst, np. "29.10.2026, 17:03:09" (string).
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('pl-PL');
}

/**
 * Funkcja zamienia listę numerów stron na tekst.
 *
 * Wejście: pages – numery stron (number[]).
 * Wyjście: tekst, np. "4, 11" (string).
 */
export function formatPageList(pages: readonly number[]): string {
  return pages.join(', ');
}
