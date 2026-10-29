/**
 * Pure helpers for assembling text extracted by pdf.js (kept free of pdf.js imports
 * so they can be unit-tested in Node).
 */

export interface PageText {
  pageNumber: number; // 1-based
  text: string;
  source: 'text-layer' | 'ocr' | 'empty';
}

export interface ExtractedDocument {
  fileName: string;
  totalPages: number;
  pages: PageText[];
  /** Pages without a text layer that could not be recovered (e.g. scans when OCR failed). */
  emptyPages: number[];
  /** Pages whose text was recovered with OCR (F-10). */
  ocrPages: number[];
}

/** Minimal shape of pdf.js TextItem we rely on. */
export interface TextItemLike {
  str: string;
  hasEOL?: boolean;
}

/**
 * Funkcja sprawdza, czy element z pdf.js zawiera tekst (type guard).
 * pdf.js zwraca elementy TextItem i TextMarkedContent.
 * Tylko TextItem ma pole "str" z tekstem.
 *
 * Wejście: item – dowolny element z getTextContent() (unknown).
 * Wyjście: true, gdy element ma pole "str" typu string (boolean).
 */
function isTextItem(item: unknown): item is TextItemLike {
  return typeof item === 'object' && item !== null && 'str' in item && typeof item.str === 'string';
}

/** Minimum number of non-whitespace characters for a page to count as having a text layer. */
export const MIN_PAGE_TEXT_CHARS = 10;

/**
 * Funkcja łączy elementy tekstu z jednej strony PDF w jeden tekst (F-02).
 * Funkcja pomija elementy bez tekstu.
 * Gdy element ma flagę hasEOL, funkcja dodaje znak nowej linii.
 * W innym przypadku funkcja dodaje spację między elementami.
 * Na końcu funkcja usuwa nadmiarowe spacje i puste linie.
 *
 * Wejście: items – lista elementów z page.getTextContent().items (unknown[]).
 * Wyjście: tekst strony (string).
 */
export function joinTextItems(items: readonly unknown[]): string {
  let out = '';
  for (const item of items) {
    if (!isTextItem(item)) continue; // marked-content items carry no text
    out += item.str;
    if (item.hasEOL) out += '\n';
    else if (item.str.length > 0 && !/\s$/.test(item.str)) out += ' ';
  }
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Funkcja sprawdza, czy strona nie ma warstwy tekstowej (np. skan).
 * Funkcja liczy znaki bez białych znaków.
 * Strona jest pusta, gdy ma mniej niż MIN_PAGE_TEXT_CHARS (10) znaków.
 *
 * Wejście: text – tekst strony (string).
 * Wyjście: true, gdy strona jest pusta (boolean).
 */
export function isPageEmpty(text: string): boolean {
  return text.replace(/\s/g, '').length < MIN_PAGE_TEXT_CHARS;
}

/**
 * Funkcja tworzy znacznik początku strony, np. "--- Strona 4 ---".
 * Model AI i funkcja splitIntoChunks używają tego znacznika.
 *
 * Wejście: n – numer strony, od 1 (number).
 * Wyjście: tekst znacznika (string).
 */
export const PAGE_MARKER = (n: number) => `--- Strona ${n} ---`;

/**
 * Funkcja łączy strony w jeden tekst dokumentu.
 * Funkcja pomija puste strony (source = "empty").
 * Przed tekstem każdej strony funkcja dodaje znacznik PAGE_MARKER.
 *
 * Wejście: pages – lista stron (PageText[]).
 * Wyjście: tekst dokumentu ze znacznikami stron (string).
 */
export function buildDocumentText(pages: readonly PageText[]): string {
  return pages
    .filter((p) => p.source !== 'empty')
    .map((p) => `${PAGE_MARKER(p.pageNumber)}\n${p.text}`)
    .join('\n\n');
}
