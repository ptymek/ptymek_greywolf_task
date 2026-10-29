import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// Bundled by Vite as a static asset → correct URL on GitHub Pages (no CDN, no CORS issues).
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { joinTextItems, isPageEmpty, type ExtractedDocument, type PageText } from './pdfText';
import { ocrCanvas, terminateOcr } from './ocr';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ExtractOptions {
  /** Try OCR (F-10) on pages without a text layer. */
  enableOcr?: boolean;
  /** Overall OCR time budget in ms (keeps the < 30 s Definition of Done). */
  ocrBudgetMs?: number;
  maxOcrPages?: number;
  onProgress?: (message: string) => void;
}

export class PdfExtractionError extends Error {
  override name = 'PdfExtractionError';
}

/**
 * Funkcja odczytuje tekst ze wszystkich stron pliku PDF (F-02).
 * Funkcja używa pdf.js w osobnym wątku (Web Worker).
 * Funkcja oznacza strony bez warstwy tekstowej jako puste.
 * Dla pustych stron funkcja uruchamia OCR (F-10), gdy enableOcr = true.
 * OCR ma limit czasu ocrBudgetMs i limit stron maxOcrPages.
 * Na końcu funkcja zawsze zwalnia pamięć dokumentu (pdf.destroy).
 *
 * Wejście:
 *   - data – zawartość pliku PDF (ArrayBuffer),
 *   - fileName – nazwa pliku (string),
 *   - options – opcje OCR i funkcja onProgress dla komunikatów postępu (ExtractOptions).
 * Wyjście: Promise z dokumentem: strony, liczba stron, puste strony, strony z OCR
 *   (ExtractedDocument).
 * Błędy: PdfExtractionError, gdy plik jest uszkodzony, ma hasło
 *   lub żadna strona nie ma tekstu.
 */
export async function extractPdfText(
  data: ArrayBuffer,
  fileName: string,
  options: ExtractOptions = {},
): Promise<ExtractedDocument> {
  const { enableOcr = true, ocrBudgetMs = 20_000, maxOcrPages = 5, onProgress } = options;

  let pdf: PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'PasswordException') {
      throw new PdfExtractionError(
        'Dokument jest zabezpieczony hasłem i nie może zostać odczytany.',
      );
    }
    throw new PdfExtractionError('Nie udało się odczytać pliku PDF. Plik może być uszkodzony.');
  }

  try {
    const pages: PageText[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Ekstrakcja tekstu: strona ${i} z ${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = joinTextItems(content.items);
      pages.push({ pageNumber: i, text, source: isPageEmpty(text) ? 'empty' : 'text-layer' });
      page.cleanup();
    }

    const ocrPages: number[] = [];
    const candidates = pages.filter((p) => p.source === 'empty').slice(0, maxOcrPages);
    if (enableOcr && candidates.length > 0) {
      const deadline = Date.now() + ocrBudgetMs;
      for (const candidate of candidates) {
        if (Date.now() > deadline) break;
        onProgress?.(`OCR skanu: strona ${candidate.pageNumber}`);
        const text = await ocrPage(pdf, candidate.pageNumber, deadline - Date.now());
        if (text && !isPageEmpty(text)) {
          candidate.text = text;
          candidate.source = 'ocr';
          ocrPages.push(candidate.pageNumber);
        }
      }
      await terminateOcr();
    }

    const emptyPages = pages.filter((p) => p.source === 'empty').map((p) => p.pageNumber);
    if (emptyPages.length === pages.length) {
      throw new PdfExtractionError(
        'Dokument nie zawiera warstwy tekstowej (prawdopodobnie skan), a OCR nie odczytał treści.',
      );
    }

    return { fileName, totalPages: pdf.numPages, pages, emptyPages, ocrPages };
  } finally {
    await pdf.destroy();
  }
}

/**
 * Funkcja odczytuje tekst jednej strony PDF metodą OCR.
 * Funkcja rysuje stronę na elemencie canvas w skali 2.
 * Potem funkcja przekazuje canvas do ocrCanvas.
 * Funkcja nie zgłasza wyjątku. Przy błędzie funkcja zwraca null.
 *
 * Wejście:
 *   - pdf – otwarty dokument pdf.js (PDFDocumentProxy),
 *   - pageNumber – numer strony, od 1 (number),
 *   - timeoutMs – maksymalny czas OCR w ms (number).
 * Wyjście: Promise z tekstem strony albo null (string | null).
 */
async function ocrPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return await ocrCanvas(canvas, timeoutMs);
  } catch {
    // OCR is a best-effort COULD feature: never fail the whole analysis because of it.
    return null;
  }
}
