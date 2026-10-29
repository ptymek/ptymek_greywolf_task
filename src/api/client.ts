/**
 * Frontend API client – talks ONLY to the backend proxy. No API key ever lives here.
 * The proxy response is re-validated with Zod before it reaches the UI (double validation).
 */

import {
  ProxyResponseSchema,
  validateAnalysisResult,
  type AnalysisMeta,
  type PdfAnalysisResult,
} from '../lib/schema';

export interface AnalyzeRequest {
  fileName: string;
  totalPages: number;
  extractedText: string;
}

export interface AnalyzeResponse {
  result: PdfAnalysisResult;
  meta: AnalysisMeta;
}

export class ApiError extends Error {
  override name = 'ApiError';
}

/** Must exceed the proxy budget: 2 attempts × 90 s (free-tier models are slow). */
const CLIENT_TIMEOUT_MS = 200_000;

/**
 * Funkcja wybiera adres backendu proxy.
 * Funkcja najpierw czyta zmienną VITE_API_URL.
 * W trybie dev bez tej zmiennej funkcja zwraca "/api/analyze" (proxy Vite).
 * W trybie produkcyjnym bez tej zmiennej funkcja zwraca null.
 *
 * Wejście: brak (funkcja czyta import.meta.env).
 * Wyjście: adres URL albo null (string | null).
 */
export function resolveApiUrl(): string | null {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  return import.meta.env.DEV ? '/api/analyze' : null;
}

const STATUS_MESSAGES: Record<number, string> = {
  403: 'Serwer odrzucił żądanie z tej domeny (CORS).',
  413: 'Dokument jest zbyt duży do analizy.',
  429: 'Przekroczono limit żądań. Odczekaj minutę i spróbuj ponownie.',
};

/**
 * Funkcja wysyła tekst dokumentu do backendu proxy i zwraca wynik analizy.
 * Frontend nie zna klucza API. Funkcja komunikuje się tylko z proxy.
 * Gdy VITE_USE_MOCK = "true", funkcja zwraca dane testowe bez zapytania.
 * Funkcja przerywa zapytanie po CLIENT_TIMEOUT_MS (200 s).
 * Funkcja sprawdza kopertę odpowiedzi (ProxyResponseSchema).
 * Potem funkcja ponownie sprawdza wynik schematem z sekcji 04 (podwójna walidacja).
 * Uwaga: funkcja nie powtarza zapytania. Ponowną próbę wykonuje proxy.
 *
 * Wejście:
 *   - request – nazwa pliku, liczba stron i tekst dokumentu (AnalyzeRequest),
 *   - onValidating – opcjonalna funkcja, którą funkcja wywołuje przed walidacją (etap 4 UI).
 * Wyjście: Promise z { result, meta } (AnalyzeResponse).
 * Błędy: ApiError z komunikatem po polsku (brak sieci, timeout, błąd HTTP, błąd walidacji).
 */
export async function analyzeDocument(
  request: AnalyzeRequest,
  onValidating?: () => void,
): Promise<AnalyzeResponse> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { buildMockResponse } = await import('./mock');
    return buildMockResponse(request);
  }

  const url = resolveApiUrl();
  if (!url) {
    throw new ApiError(
      'Brak konfiguracji adresu backendu (VITE_API_URL). Skontaktuj się z autorem.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Przekroczono czas oczekiwania na odpowiedź serwera.');
    }
    throw new ApiError('Brak połączenia z serwerem analizy. Sprawdź połączenie z internetem.');
  } finally {
    clearTimeout(timer);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      STATUS_MESSAGES[response.status] ??
        `Serwer zwrócił niepoprawną odpowiedź (HTTP ${response.status}).`,
    );
  }

  const envelope = ProxyResponseSchema.safeParse(body);
  if (!envelope.success) {
    throw new ApiError(
      STATUS_MESSAGES[response.status] ?? 'Serwer zwrócił odpowiedź w nieoczekiwanym formacie.',
    );
  }
  if (!envelope.data.success) {
    throw new ApiError(envelope.data.error);
  }

  onValidating?.();
  const validation = validateAnalysisResult(envelope.data.data);
  if (!validation.success || !validation.data) {
    throw new ApiError(`Wynik analizy nie przeszedł walidacji schematu: ${validation.error ?? ''}`);
  }

  return { result: validation.data, meta: envelope.data.meta };
}
