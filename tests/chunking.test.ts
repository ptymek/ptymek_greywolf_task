import { describe, it, expect } from 'vitest';
import { mergeChunkResults, splitIntoChunks } from '../src/lib/chunking';
import { buildDocumentText } from '../src/lib/pdfText';
import { validateAnalysisResult } from '../src/lib/schema';
import { validResult } from './fixtures';

describe('F-08: chunking of long documents', () => {
  it('AUTO-13: keeps short documents in a single chunk', () => {
    expect(splitIntoChunks('--- Strona 1 ---\nkrótki tekst', 1000)).toHaveLength(1);
  });

  it('AUTO-14: splits on page boundaries without losing text', () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      pageNumber: i + 1,
      text: `Treść strony ${i + 1} `.repeat(20),
      source: 'text-layer' as const,
    }));
    const text = buildDocumentText(pages);
    const chunks = splitIntoChunks(text, 1200);

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1200);
      expect(c.startsWith('--- Strona')).toBe(true);
    }
    for (let i = 1; i <= 10; i++) {
      expect(chunks.join('\n').includes(`--- Strona ${i} ---`)).toBe(true);
    }
  });

  it('hard-splits a single page longer than the chunk size', () => {
    const chunks = splitIntoChunks(`--- Strona 1 ---\n${'a'.repeat(2500)}`, 1000);
    expect(chunks.length).toBe(3);
  });

  it('AUTO-15: merges chunk results into one schema-valid result with deduplication', () => {
    const second = {
      ...validResult,
      document: { ...validResult.document, date: null },
      entities: { organizations: ['kwadrat software s.a.', 'Inna Firma sp. z o.o.'], people: [] },
      amounts: [
        ...validResult.amounts,
        { value: 8600, currency: 'EUR', context: 'roczne opłaty licencyjne' },
      ],
      dates: [{ date: '2026-01-05', context: 'wcześniejsza data' }],
    };
    const merged = mergeChunkResults([validResult, second]);

    expect(validateAnalysisResult(merged).success).toBe(true);
    expect(merged.entities.organizations).toEqual([
      'Nordwave Logistics sp. z o.o.',
      'Kwadrat Software S.A.',
      'Inna Firma sp. z o.o.',
    ]);
    expect(merged.amounts).toHaveLength(2);
    expect(merged.dates[0]?.date).toBe('2026-01-05'); // chronological
    expect(merged.document.date).toBe('2026-03-12');
    expect(merged.keyPoints.length).toBeLessThanOrEqual(7);
  });

  it('uses the combined summary from the merge step when available', () => {
    const combined = {
      summary: 'Zdanie pierwsze. Zdanie drugie. Zdanie trzecie.',
      keyPoints: ['a', 'b', 'c'],
    };
    const merged = mergeChunkResults([validResult, validResult], combined);
    expect(merged.summary).toBe(combined.summary);
    expect(merged.keyPoints).toEqual(['a', 'b', 'c']);
  });
});
