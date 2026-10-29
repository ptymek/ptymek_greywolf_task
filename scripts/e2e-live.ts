/**
 * Live end-to-end check (manual, costs API quota):
 *   real PDF → pdf.js text → proxy pipeline → OpenRouter → Zod validation.
 *
 * Usage:  OPENROUTER_API_KEY=... npm run e2e:live [-- path/to/file.pdf]
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildDocumentText, isPageEmpty, joinTextItems, type PageText } from '../src/lib/pdfText';
import { analyzeDocument, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS } from '../api/proxy';

const pdfPath = process.argv[2] ?? 'Test_PDF_Insight_umowa_14-2026.pdf';
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Brak OPENROUTER_API_KEY w zmiennych środowiskowych.');
  process.exit(1);
}

const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(pdfPath)) }).promise;
const pages: PageText[] = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const text = joinTextItems((await page.getTextContent()).items);
  pages.push({ pageNumber: i, text, source: isPageEmpty(text) ? 'empty' : 'text-layer' });
}
const text = buildDocumentText(pages);
console.log(
  `stron: ${pdf.numPages}, puste: [${pages.filter((p) => p.source === 'empty').map((p) => p.pageNumber)}], znaków: ${text.length}`,
);

const started = Date.now();
const result = await analyzeDocument(
  { fileName: basename(pdfPath), totalPages: pdf.numPages, extractedText: text },
  apiKey,
  process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
  Number(process.env.OPENROUTER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
);
console.log(`czas analizy: ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
