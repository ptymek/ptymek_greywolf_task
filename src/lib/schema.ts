import { z } from 'zod';

/**
 * PDF Insight Document Analysis Result Schema
 * Strictly matches Section 04 of the Technical Brief.
 */

export const DocumentTypeEnum = z.enum(['faktura', 'umowa', 'oferta', 'raport', 'inne']);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

// ISO 8601 Date regex validator (YYYY-MM-DD or full ISO timestamp)
const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

// ISO 4217 Currency code regex (3 uppercase letters, e.g., PLN, EUR, USD)
const isoCurrencyRegex = /^[A-Z]{3}$/;

// ISO 639-1 language code (2 lowercase letters, e.g., pl, en)
const isoLanguageRegex = /^[a-z]{2}$/;

const isoDate = z
  .string()
  .regex(isoDateRegex, 'Data musi być w formacie ISO 8601 (np. RRRR-MM-DD)')
  .refine((val) => !Number.isNaN(Date.parse(val)), 'Data ISO 8601 nie istnieje w kalendarzu');

/**
 * Funkcja liczy zdania w tekście.
 * Funkcja dzieli tekst po znaku ".", "!", "?" lub "…".
 * Podział następuje tylko wtedy, gdy po znaku jest spacja i wielka litera albo cyfra.
 * Dzięki temu skróty, np. "sp. z o.o." i "12.03.2026 r.", nie kończą zdania.
 * Funkcja pomija fragmenty krótsze niż 4 znaki.
 *
 * Wejście: text – tekst do analizy (string).
 * Wyjście: liczba zdań (number).
 */
export function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9„"])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 3).length;
}

// Document Metadata
export const DocumentMetadataSchema = z.object({
  fileName: z.string().min(1, 'Nazwa pliku nie może być pusta'),
  pages: z.number().int().positive('Liczba stron musi być liczbą całkowitą dodatnią'),
  language: z.string().regex(isoLanguageRegex, 'Język musi być kodem ISO 639-1 (np. pl, en)'),
  type: DocumentTypeEnum,
  title: z.string().min(1, 'Tytuł dokumentu jest wymagany'),
  date: isoDate.nullable(),
});

// Named Entities
export const EntitiesSchema = z.object({
  organizations: z.array(z.string().min(1)).default([]),
  people: z.array(z.string().min(1)).default([]),
});

// Financial Amounts
export const AmountEntrySchema = z.object({
  value: z.number().finite(),
  currency: z
    .string()
    .regex(isoCurrencyRegex, 'Waluta musi być 3-literowym kodem ISO 4217 (np. PLN, EUR, USD)'),
  context: z.string().min(1, 'Wymagany kontekst kwoty'),
});

// Dates Context
export const DateEntrySchema = z.object({
  date: isoDate,
  context: z.string().min(1, 'Wymagany kontekst daty'),
});

/**
 * Brief: summary = 3–5 sentences. The sentence counter is a heuristic (abbreviations, numbers),
 * so validation tolerates ±1 sentence (2–6) while the prompt asks the model for exactly 3–5.
 */
export const SUMMARY_MIN_SENTENCES = 2;
export const SUMMARY_MAX_SENTENCES = 6;
export const KEY_POINTS_MIN = 3;
export const KEY_POINTS_MAX = 7;

// Root Analysis Schema
export const PdfAnalysisResultSchema = z.object({
  document: DocumentMetadataSchema,
  summary: z
    .string()
    .min(10, 'Podsumowanie musi zawierać co najmniej 10 znaków')
    .refine((val) => {
      const n = countSentences(val);
      return n >= SUMMARY_MIN_SENTENCES && n <= SUMMARY_MAX_SENTENCES;
    }, 'Podsumowanie powinno zawierać od 3 do 5 zdań'),
  keyPoints: z
    .array(z.string().min(1))
    .min(KEY_POINTS_MIN, `Wymagane co najmniej ${KEY_POINTS_MIN} kluczowe punkty`)
    .max(KEY_POINTS_MAX, `Maksymalnie ${KEY_POINTS_MAX} kluczowych punktów`),
  entities: EntitiesSchema,
  amounts: z.array(AmountEntrySchema).default([]),
  dates: z.array(DateEntrySchema).default([]),
  keywords: z.array(z.string().min(1)).default([]),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type Entities = z.infer<typeof EntitiesSchema>;
export type AmountEntry = z.infer<typeof AmountEntrySchema>;
export type DateEntry = z.infer<typeof DateEntrySchema>;
export type PdfAnalysisResult = z.infer<typeof PdfAnalysisResultSchema>;

/**
 * Funkcja sprawdza, czy dane są zgodne ze schematem z sekcji 04 briefu.
 * Funkcja używa schematu PdfAnalysisResultSchema (Zod).
 * Funkcja nie zgłasza wyjątku. Funkcja zwraca błędy jako tekst.
 *
 * Wejście: data – niezaufane dane, np. odpowiedź modelu AI (unknown).
 * Wyjście: obiekt { success, data?, error? }:
 *   - success = true: data zawiera wynik z poprawnymi typami (PdfAnalysisResult),
 *   - success = false: error zawiera listę błędów w formacie "ścieżka: komunikat; ...".
 */
export function validateAnalysisResult(data: unknown): {
  success: boolean;
  data?: PdfAnalysisResult;
  error?: string;
} {
  const result = PdfAnalysisResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  return { success: false, error: issues };
}

/**
 * Metadata returned by the proxy next to the analysis (not part of the exported JSON).
 */
export const AnalysisMetaSchema = z.object({
  model: z.string(),
  attempts: z.number().int().nonnegative(),
  chunks: z.number().int().positive(),
  injectionDetected: z.boolean(),
  injectionPatterns: z.array(z.string()),
  truncated: z.boolean(),
});

export type AnalysisMeta = z.infer<typeof AnalysisMetaSchema>;

export const ProxySuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: AnalysisMetaSchema,
});

export const ProxyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const ProxyResponseSchema = z.discriminatedUnion('success', [
  ProxySuccessResponseSchema,
  ProxyErrorResponseSchema,
]);
