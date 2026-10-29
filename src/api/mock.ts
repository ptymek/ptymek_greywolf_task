/**
 * Local UI development without an API key: VITE_USE_MOCK=true in .env.local.
 * Returns a static, schema-valid result after a short delay.
 */

import { detectPromptInjectionSignatures } from '../lib/prompt';
import type { AnalyzeRequest, AnalyzeResponse } from './client';

/**
 * Funkcja zwraca testowy wynik analizy bez zapytania do AI (tylko dev).
 * Funkcja czeka 1,2 s, aby UI pokazało stan ładowania.
 * Funkcja uruchamia prawdziwą detekcję sygnatur ataku.
 *
 * Wejście: request – nazwa pliku, liczba stron i tekst dokumentu (AnalyzeRequest).
 * Wyjście: Promise z wynikiem zgodnym ze schematem (AnalyzeResponse).
 */
export async function buildMockResponse(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const injection = detectPromptInjectionSignatures(request.extractedText);
  return {
    meta: {
      model: 'mock',
      attempts: 1,
      chunks: 1,
      injectionDetected: injection.detected,
      injectionPatterns: injection.patterns,
      truncated: false,
    },
    result: {
      document: {
        fileName: request.fileName,
        pages: request.totalPages,
        language: 'pl',
        type: 'inne',
        title: 'Dane przykładowe (tryb mock)',
        date: null,
      },
      summary:
        'To jest przykładowy wynik wygenerowany w trybie deweloperskim. Aplikacja nie wysłała dokumentu do modelu AI. Wyłącz VITE_USE_MOCK, aby uzyskać prawdziwą analizę.',
      keyPoints: [
        'Tryb mock jest aktywny',
        'Brak wywołania API',
        'Dane służą wyłącznie do testów UI',
      ],
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: ['mock'],
    },
  };
}
