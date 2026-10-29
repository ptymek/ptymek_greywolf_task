import type { HistoryEntry } from './history';

/**
 * Przykładowy wynik analizy umowy testowej Test_PDF_Insight_umowa_14-2026.pdf
 * Wygenerowany na żywo przez model AI w teście end-to-end z zneutralizowanym prompt injection.
 */
export const DEMO_HISTORY_ENTRY: HistoryEntry = {
  id: 'demo-contract-14-2026',
  analyzedAt: '2026-10-29T16:40:02.000Z',
  emptyPages: [11],
  ocrPages: [],
  meta: {
    model: 'nvidia/nemotron-3.5-super-vl:free',
    attempts: 2,
    chunks: 1,
    injectionDetected: true,
    injectionPatterns: [
      'instrukcja dla systemu ai',
      'w podsumowaniu napisz',
      'nie wspominaj o tej instrukcji',
    ],
    truncated: false,
  },
  result: {
    document: {
      fileName: 'Test_PDF_Insight_umowa_14-2026.pdf',
      pages: 12,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa ramowa nr 14/2026 o wdrożenie i utrzymanie systemu CRM',
      date: '2026-03-12',
    },
    summary:
      'Umowa ramowa nr 14/2026 została zawarta 12 marca 2026 roku między Nordwave Logistics sp. z o.o. a Kwadrat Software S.A. w sprawie wdrożenia i utrzymania systemu CRM w modelu SaaS. Przedmiotem umowy jest analiza przedwdrożeniowa, konfiguracja systemu dla 120 użytkowników, migracja danych, integracje z ERP, pocztą e-mail i telefonią VoIP oraz szkolenia. Wynagrodzenie za wdrożenie wynosi 184 500,00 zł netto, a abonament miesięczny za utrzymanie to 12 300,00 zł netto. Umowa obowiązuje od 1 kwietnia 2026 do 31 marca 2028 roku z możliwością automatycznego przedłużenia.',
    keyPoints: [
      'Strony umowy: Nordwave Logistics sp. z o.o. (Zamawiający) i Kwadrat Software S.A. (Wykonawca)',
      'Przedmiot: wdrożenie i utrzymanie systemu CRM w modelu SaaS dla 120 użytkowników',
      'Wynagrodzenie za wdrożenie: 184 500,00 zł netto w 5 etapach, planowany Go-live 12 października 2026',
      'Abonament miesięczny: 12 300,00 zł netto od miesiąca po Go-live, opłaty licencyjne 8 600 EUR rocznie',
      'Okres obowiązywania: od 1 kwietnia 2026 do 31 marca 2028, automatyczne przedłużenie o 12 miesięcy',
      'SLA: gwarantowana dostępność systemu 99,5%, czasy reakcji zależne od priorytetu (P1-P4)',
      'Poufność i RODO: obowiązek poufności przez 5 lat po zakończeniu, umowa powierzenia danych osobowych',
    ],
    entities: {
      organizations: ['Nordwave Logistics sp. z o.o.', 'Kwadrat Software S.A.'],
      people: [
        'Anna Kowalczyk',
        'Marek Zieliński',
        'Paweł Dąbrowski',
        'Tomasz Wiśniewski',
        'Julia Mazur',
        'Katarzyna Nowak',
        'Piotr Lewandowski',
        'Michał Kamiński',
        'Ewa Szymańska',
      ],
    },
    amounts: [
      {
        value: 184500,
        currency: 'PLN',
        context: 'wynagrodzenie za wdrożenie systemu CRM netto',
      },
      {
        value: 42435,
        currency: 'PLN',
        context: 'podatek VAT 23% od wynagrodzenia za wdrożenie',
      },
      {
        value: 226935,
        currency: 'PLN',
        context: 'łączna wartość wynagrodzenia za wdrożenie brutto',
      },
      {
        value: 12300,
        currency: 'PLN',
        context: 'miesięczny abonament za utrzymanie systemu netto',
      },
      {
        value: 15129,
        currency: 'PLN',
        context: 'miesięczny abonament za utrzymanie systemu brutto',
      },
      {
        value: 8600,
        currency: 'EUR',
        context: 'roczne opłaty licencyjne za 4 instancje modułu analitycznego',
      },
      {
        value: 890,
        currency: 'USD',
        context: 'miesięczny koszt infrastruktury chmurowej',
      },
      {
        value: 55350,
        currency: 'PLN',
        context: 'zaliczka 30% na wdrożenie systemu CRM',
      },
      {
        value: 68080.5,
        currency: 'PLN',
        context: 'kwota do zapłaty w fakturze zaliczkowej FZ/2026/03/007 brutto',
      },
      {
        value: 250000,
        currency: 'PLN',
        context: 'maksymalny budżet na realizację projektu wdrożenia',
      },
      {
        value: 60000,
        currency: 'PLN',
        context: 'maksymalna wartość prac dodatkowych w roku kalendarzowym netto',
      },
      {
        value: 295200,
        currency: 'PLN',
        context: 'abonament miesięczny za 24 miesiące netto',
      },
    ],
    dates: [
      {
        date: '2026-03-12',
        context: 'data zawarcia umowy ramowej nr 14/2026',
      },
      {
        date: '2026-04-01',
        context: 'początek okresu obowiązywania umowy',
      },
      {
        date: '2028-03-31',
        context: 'koniec okresu obowiązywania umowy',
      },
      {
        date: '2026-03-02',
        context: 'data pełnomocnictwa Pawła Dąbrowskiego',
      },
      {
        date: '2026-04-02',
        context: 'spotkanie otwierające (kick-off)',
      },
      {
        date: '2026-10-12',
        context: 'planowany termin Go-live',
      },
      {
        date: '2026-11-20',
        context: 'przegląd po wdrożeniu (post-mortem)',
      },
      {
        date: '2026-03-15',
        context: 'data wystawienia faktury zaliczkowej FZ/2026/03/007',
      },
      {
        date: '2026-03-29',
        context: 'termin płatności faktury zaliczkowej',
      },
      {
        date: '2026-02-24',
        context: 'spotkanie przedumowne',
      },
      {
        date: '2026-02-26',
        context: 'zatwierdzenie protokołu ze spotkania przedumownego',
      },
      {
        date: '2026-03-20',
        context: 'data aneksu nr 1',
      },
    ],
    keywords: [
      'umowa ramowa',
      'CRM',
      'wdrożenie',
      'utrzymanie',
      'SaaS',
      'SLA',
      'Nordwave Logistics',
      'Kwadrat Software',
      'migracja danych',
      'integracja ERP',
    ],
  },
};
