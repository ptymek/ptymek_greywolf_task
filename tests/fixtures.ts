import type { PdfAnalysisResult } from '../src/lib/schema';

export const validResult: PdfAnalysisResult = {
  document: {
    fileName: 'umowa.pdf',
    pages: 12,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa ramowa nr 14/2026 o wdrożenie i utrzymanie systemu CRM',
    date: '2026-03-12',
  },
  summary:
    'Umowa ramowa określa zasady wdrożenia systemu CRM przez Kwadrat Software dla Nordwave Logistics. Wdrożenie obejmuje pięć etapów z planowanym Go-live 12 października 2026 roku. Wynagrodzenie za wdrożenie wynosi 184 500,00 PLN netto.',
  keyPoints: ['Wdrożenie CRM dla 120 użytkowników', 'Pięć etapów wdrożenia', 'SLA 99,5%'],
  entities: {
    organizations: ['Nordwave Logistics sp. z o.o.', 'Kwadrat Software S.A.'],
    people: ['Anna Kowalczyk', 'Paweł Dąbrowski'],
  },
  amounts: [{ value: 184500, currency: 'PLN', context: 'wynagrodzenie za wdrożenie netto' }],
  dates: [{ date: '2026-03-12', context: 'data zawarcia umowy' }],
  keywords: ['CRM', 'SLA'],
};
