import { describe, it, expect } from 'vitest';
import { validateAnalysisResult, countSentences } from '../src/lib/schema';

describe('PDF Insight Schema Validation (Brief Section 04)', () => {
  const validMockData = {
    document: {
      fileName: 'umowa_14-2026.pdf',
      pages: 12,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa ramowa nr 14/2026 o wdrożenie i utrzymanie systemu CRM',
      date: '2026-03-12',
    },
    summary:
      'Umowa ramowa określa zasady wdrożenia systemu CRM przez firmę Kwadrat Software dla Nordwave Logistics. Projekt obejmuje pięć głównych etapów z planowanym terminem Go-live na dzień 12 października 2026 roku. Łączne wynagrodzenie ryczałtowe za etap wdrożenia wynosi 184 500,00 PLN netto.',
    keyPoints: [
      'Wdrożenie systemu CRM dla 120 użytkowników w modelu SaaS.',
      'Harmonogram obejmuje 5 etapów od 1 kwietnia do 6 listopada 2026 r.',
      'Gwarantowana dostępność Systemu SLA na poziomie 99,5%.',
    ],
    entities: {
      organizations: ['Nordwave Logistics sp. z o.o.', 'Kwadrat Software S.A.'],
      people: ['Anna Kowalczyk', 'Paweł Dąbrowski'],
    },
    amounts: [
      { value: 184500.0, currency: 'PLN', context: 'wynagrodzenie za wdrożenie netto' },
      { value: 12300.0, currency: 'PLN', context: 'miesięczny abonament utrzymaniowy' },
      { value: 8600.0, currency: 'EUR', context: 'roczne opłaty licencyjne' },
      { value: 890.0, currency: 'USD', context: 'miesięczny koszt hostingu' },
    ],
    dates: [
      { date: '2026-03-12', context: 'data zawarcia umowy' },
      { date: '2026-10-12', context: 'planowany termin Go-live' },
      { date: '2028-03-31', context: 'koniec 24-miesięcznego okresu obowiązywania' },
    ],
    keywords: ['CRM', 'SLA', 'wdrożenie', 'Go-live', 'Nordwave Logistics'],
  };

  it('AUTO-01: validates a fully compliant analysis result', () => {
    const result = validateAnalysisResult(validMockData);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.document.type).toBe('umowa');
  });

  it('AUTO-02: rejects invalid non-ISO date formats', () => {
    const invalidData = {
      ...validMockData,
      document: {
        ...validMockData.document,
        date: '12.03.2026', // invalid, should be YYYY-MM-DD
      },
    };
    const result = validateAnalysisResult(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ISO 8601');
  });

  it('AUTO-03: rejects invalid currency code formats', () => {
    const invalidData = {
      ...validMockData,
      amounts: [{ value: 100, currency: 'zł', context: 'cena' }],
    };
    const result = validateAnalysisResult(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ISO 4217');
  });

  it('AUTO-04: allows null dates and empty arrays when data is absent', () => {
    const absentInfoData = {
      ...validMockData,
      document: {
        ...validMockData.document,
        date: null,
      },
      entities: {
        organizations: [],
        people: [],
      },
      amounts: [],
      dates: [],
    };
    const result = validateAnalysisResult(absentInfoData);
    expect(result.success).toBe(true);
    expect(result.data?.document.date).toBeNull();
    expect(result.data?.amounts).toEqual([]);
  });

  it('AUTO-05: rejects invalid document types outside defined enum', () => {
    const invalidTypeData = {
      ...validMockData,
      document: {
        ...validMockData.document,
        type: 'nieznany_typ',
      },
    };
    const result = validateAnalysisResult(invalidTypeData);
    expect(result.success).toBe(false);
  });

  it('AUTO-11: enforces 3–7 key points (brief section 04)', () => {
    const tooFew = validateAnalysisResult({ ...validMockData, keyPoints: ['a', 'b'] });
    const tooMany = validateAnalysisResult({
      ...validMockData,
      keyPoints: ['1', '2', '3', '4', '5', '6', '7', '8'],
    });
    expect(tooFew.success).toBe(false);
    expect(tooMany.success).toBe(false);
  });

  it('AUTO-12: rejects a one-sentence summary', () => {
    const result = validateAnalysisResult({
      ...validMockData,
      summary: 'Umowa dotyczy wdrożenia CRM.',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('3 do 5 zdań');
  });

  it('countSentences ignores Polish abbreviations and dates', () => {
    expect(
      countSentences(
        'Umowę zawarto 12.03.2026 r. pomiędzy Nordwave Logistics sp. z o.o. a Kwadrat Software S.A. we Wrocławiu. Wynagrodzenie wynosi 184 500,00 zł netto. Go-live zaplanowano na 12 października 2026 r.',
      ),
    ).toBe(3);
  });

  it('rejects non ISO 639-1 language codes and impossible dates', () => {
    const badLang = validateAnalysisResult({
      ...validMockData,
      document: { ...validMockData.document, language: 'polski' },
    });
    const badDate = validateAnalysisResult({
      ...validMockData,
      dates: [{ date: '2026-13-45', context: 'błędna data' }],
    });
    expect(badLang.success).toBe(false);
    expect(badDate.success).toBe(false);
  });

  it('fills missing optional arrays with [] instead of guessing', () => {
    const { amounts: _a, dates: _d, keywords: _k, ...rest } = validMockData;
    const result = validateAnalysisResult(rest);
    expect(result.success).toBe(true);
    expect(result.data?.amounts).toEqual([]);
    expect(result.data?.dates).toEqual([]);
    expect(result.data?.keywords).toEqual([]);
  });
});
