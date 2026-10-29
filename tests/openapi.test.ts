import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import spec from '../openapi.yaml?raw';
import {
  DocumentTypeEnum,
  KEY_POINTS_MAX,
  KEY_POINTS_MIN,
  validateAnalysisResult,
  AnalysisMetaSchema,
} from '../src/lib/schema';
import { ProxyRequestSchema } from '../api/proxy';

const doc: unknown = parse(spec);

/**
 * Funkcja odczytuje wartość z zagnieżdżonego obiektu według ścieżki.
 * Wejście: path – lista kluczy, np. ['components', 'schemas'] (string[]).
 * Wyjście: wartość albo undefined (unknown).
 */
function get(path: string[]): unknown {
  let node: unknown = doc;
  for (const key of path) {
    if (typeof node !== 'object' || node === null || !(key in node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/**
 * Funkcja odczytuje element schematu z components.schemas.
 * Wejście: name – nazwa schematu (string); rest – dalsza ścieżka (string[]).
 * Wyjście: wartość albo undefined (unknown).
 */
const schema = (name: string, ...rest: string[]) => get(['components', 'schemas', name, ...rest]);

describe('OpenAPI (openapi.yaml) zgodność z kodem', () => {
  it('AUTO-22: typy dokumentu w OpenAPI = enum Zod', () => {
    expect(schema('DocumentType', 'enum')).toEqual(DocumentTypeEnum.options);
  });

  it('AUTO-23: limity keyPoints i żądania są takie same jak w Zod', () => {
    expect(schema('PdfAnalysisResult', 'properties', 'keyPoints', 'minItems')).toBe(KEY_POINTS_MIN);
    expect(schema('PdfAnalysisResult', 'properties', 'keyPoints', 'maxItems')).toBe(KEY_POINTS_MAX);
    expect(schema('AnalyzeRequest', 'properties', 'fileName', 'maxLength')).toBe(255);
    expect(
      ProxyRequestSchema.safeParse({ fileName: 'x'.repeat(256), totalPages: 1, extractedText: 'a' })
        .success,
    ).toBe(false);
    expect(schema('AnalyzeRequest', 'properties', 'totalPages', 'maximum')).toBe(10_000);
    expect(
      ProxyRequestSchema.safeParse({ fileName: 'a.pdf', totalPages: 10_001, extractedText: 'a' })
        .success,
    ).toBe(false);
  });

  it('AUTO-24: przykład odpowiedzi 200 przechodzi walidację Zod', () => {
    const example = get(['components', 'examples', 'UmowaSuccess', 'value']);
    const data = (example as { data?: unknown } | undefined)?.data;
    const meta = (example as { meta?: unknown } | undefined)?.meta;
    const result = validateAnalysisResult(data);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(AnalysisMetaSchema.safeParse(meta).success).toBe(true);
  });

  it('AUTO-25: przykład żądania przechodzi walidację ProxyRequestSchema', () => {
    const example = get([
      'paths',
      '/api/analyze',
      'post',
      'requestBody',
      'content',
      'application/json',
      'examples',
      'umowa',
      'value',
    ]);
    expect(ProxyRequestSchema.safeParse(example).success).toBe(true);
  });

  it('dokumentuje wszystkie kody HTTP zwracane przez handleAnalyzeRequest', () => {
    const responses = get(['paths', '/api/analyze', 'post', 'responses']);
    expect(Object.keys(responses as object).sort()).toEqual(
      ['200', '400', '403', '405', '413', '429', '500', '502'].sort(),
    );
  });
});
