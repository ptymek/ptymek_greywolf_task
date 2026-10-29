import { z } from 'zod';

/**
 * PDF Insight Document Analysis Result Schema
 * Strictly matches Section 04 of the Technical Brief.
 */

export const DocumentTypeEnum = z.enum([
  'faktura',
  'umowa',
  'oferta',
  'raport',
  'inne',
]);

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

// ISO 8601 Date regex validator (YYYY-MM-DD or full ISO timestamp)
const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

// ISO 4217 Currency code regex (3 uppercase letters, e.g., PLN, EUR, USD)
const isoCurrencyRegex = /^[A-Z]{3}$/;

// Document Metadata
export const DocumentMetadataSchema = z.object({
  fileName: z.string().min(1, 'Nazwa pliku nie może być pusta'),
  pages: z.number().int().positive('Liczba stron musi być liczbą całkowitą dodatnią'),
  language: z.string().min(2).max(10), // e.g. "pl", "en", ISO 639-1
  type: DocumentTypeEnum,
  title: z.string().min(1, 'Tytuł dokumentu jest wymagany'),
  date: z
    .string()
    .regex(isoDateRegex, 'Data musi być w formacie ISO 8601 (np. RRRR-MM-DD)')
    .nullable(),
});

// Named Entities
export const EntitiesSchema = z.object({
  organizations: z.array(z.string()).default([]),
  people: z.array(z.string()).default([]),
});

// Financial Amounts
export const AmountEntrySchema = z.object({
  value: z.number(),
  currency: z
    .string()
    .regex(isoCurrencyRegex, 'Waluta musi być 3-literowym kodem ISO 4217 (np. PLN, EUR, USD)'),
  context: z.string().min(1, 'Wymagany kontekst kwoty'),
});

// Dates Context
export const DateEntrySchema = z.object({
  date: z
    .string()
    .regex(isoDateRegex, 'Data musi być w formacie ISO 8601 (np. RRRR-MM-DD)'),
  context: z.string().min(1, 'Wymagany kontekst daty'),
});

// Root Analysis Schema
export const PdfAnalysisResultSchema = z.object({
  document: DocumentMetadataSchema,
  summary: z
    .string()
    .min(10, 'Podsumowanie musi zawierać co najmniej 10 znaków')
    .refine((val) => {
      // Split roughly by sentence delimiters (. ! ?)
      const sentences = val
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
      return sentences.length >= 2;
    }, 'Podsumowanie powinno zawierać od 3 do 5 zdań'),
  keyPoints: z
    .array(z.string())
    .min(1, 'Wymagany przynajmniej jeden kluczowy punkt')
    .max(10, 'Maksymalnie 10 kluczowych punktów'),
  entities: EntitiesSchema,
  amounts: z.array(AmountEntrySchema).default([]),
  dates: z.array(DateEntrySchema).default([]),
  keywords: z.array(z.string()).default([]),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type Entities = z.infer<typeof EntitiesSchema>;
export type AmountEntry = z.infer<typeof AmountEntrySchema>;
export type DateEntry = z.infer<typeof DateEntrySchema>;
export type PdfAnalysisResult = z.infer<typeof PdfAnalysisResultSchema>;

/**
 * Validates untrusted input and returns safe typed result or raises structured errors.
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
