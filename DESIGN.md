# PDF Insight — Design System & TypeUI Specification

Specyfikacja interfejsu użytkownika stworzona w oparciu o wytyczne **[TypeUI (bergside/typeui)](https://github.com/bergside/typeui)**, standardy briefu rekrutacyjnego **Greywolf Group (Vibe Coder)** oraz zasady dostępności WCAG AA.

---

## 1. Filozofia Designu TypeUI

Projekt łączy minimalistyczny styl **Editorial Tech** z nowoczesnym motywem **Sleek Dark Glass**:
- **Typografia**: Główny font bezszeryfowy (*Plus Jakarta Sans* / *Inter*) dla czytelności treści oraz font stałej szerokości (*JetBrains Mono* / *Fira Code*) dla wartości technicznych, kwot, dat, tagów i widoku JSON.
- **Paleta barw**: Dyskretna baza grafitowo-węglowa (Dark Mode First) z neonowo-bursztynowymi akcentami (`#F59E0B` / Amber) oraz chłodnymi akcentami indygo/cyan (`#6366F1` / `#06B6D4`), co nadaje aplikacji technologiczny, precyzyjny charakter Vibe Codingu.
- **Mikrointerakcje**: Płynne przejścia (transitions 150–200ms), subtelne obramowania z efektem poświaty przy `focus-visible`, haptyczny feedback stanu przeciągania pliku (*drag & drop*).

---

## 2. Tokeny Stylistyczne (Design Tokens)

```css
:root {
  /* Kolory tła */
  --bg-app: #0B0F17;
  --bg-surface: #111827;
  --bg-surface-elevated: #1F2937;
  --bg-card: rgba(17, 24, 39, 0.75);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-active: rgba(245, 158, 11, 0.4);

  /* Kolory akcentów */
  --accent-primary: #F59E0B;       /* Amber - kluczowe akcje, przyciski */
  --accent-primary-hover: #D97706;
  --accent-info: #38BDF8;          /* Cyan - statusy, podpowiedzi */
  --accent-success: #10B981;       /* Emerald - walidacja, sukces */
  --accent-error: #EF4444;         /* Rose - błędy, ostrzeżenia */
  --accent-purple: #8B5CF6;        /* Podmioty, encje */

  /* Typografia */
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Cienie i zaokrąglenia */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-glow: 0 0 25px rgba(245, 158, 11, 0.15);
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.35);
}
```

---

## 3. Komponenty UI i Ekrany

### 3.1. Header & Status Bar
- **Logo / Tytuł**: `PDF INSIGHT` z etykietą `// Greywolf AI Engine`.
- **Badge prywatności**: `🔒 Plik trafia do API AI` (spełnienie wymogu bezpieczeństwa z briefu).
- **Akcje**: Przełącznik historii analiz, link do repozytorium GitHub.

### 3.2. Strefa Wgrywania (F-01 Dropzone)
- **Komponent**: `FileUploadDropzone`
- **Zachowanie**:
  - Obsługa Drag & Drop oraz tradycyjnego kliknięcia (file selector).
  - Filtracja: wyłącznie MIME `application/pdf` i rozszerzenie `.pdf`.
  - Walidacja rozmiaru: natychmiastowe odrzucenie plików > 10 MB z komunikatem w języku polskim.
  - Wyraźna ramka przerywana, podświetlająca się na bursztynowo w momencie najechania plikiem.

### 3.3. Stan Ładowania (F-06 Loading Stepper)
- **Komponent**: `ProcessingProgress`
- **Etapy wizualne**:
  1. `Odczyt pliku PDF` (walidacja nagłówka i rozmiaru)
  2. `Ekstrakcja tekstu` (pdf.js worker z podaniem liczby stron)
  3. `Analiza AI & ekstrakcja encji` (zapytanie do API proxy)
  4. `Walidacja schematu Zod` (weryfikacja formatu sekcji 04)
- **Pasek postępu**: Elegancki gradientowy pasek animowany CSS.

### 3.4. Stan Błędu (F-06 Error Recovery)
- **Komponent**: `ErrorBanner`
- **Zawartość**: Czytelny komunikat błędu po polsku (np. przekroczony rozmiar, błąd parsowania, błąd API po 2 próbach).
- **Akcja**: Przycisk `[Spróbuj ponownie]`, który ponawia ostatnią akcję bez konieczności ponownego wybierania pliku z dysku.

### 3.5. Widok Wyników (F-04 & F-05 Dashboard)
- **Podsumowanie dokumentu (Executive Summary)**:
  - 3–5 zdań w języku dokumentu.
  - Karta wyróżniona delikatnym tłem ze statusem typu dokumentu (np. `Umowa`, `Faktura`).
- **Metadane dokumentu**:
  - Kafelki: Liczba stron, Wykryty język, Data dokumentu, Typ.
- **Kluczowe Punkty (Key Points)**:
  - Numerowana lista 3–7 najważniejszych wniosków biznesowych.
- **Encje (Entities)**:
  - Karta Organizacji (np. `Nordwave Logistics sp. z o.o.`, `Kwadrat Software S.A.`).
  - Karta Osób (np. `Anna Kowalczyk`, `Paweł Dąbrowski`).
- **Kwoty i Finanse (Amounts)**:
  - Tabela / grid kafelków z wyróżnioną walutą ISO i kontekstem (np. `184 500,00 PLN` – *wynagrodzenie za wdrożenie*).
- **Terminy i Daty (Dates)**:
  - Chronologiczna lista z datą ISO 8601 i kontekstem.
- **Słowa kluczowe**:
  - Chmura estetycznych tagów (*badges*).
- **Inspektor JSON & Eksport**:
  - Podgląd sformatowanego JSON z kolorowaniem składni.
  - Przycisk `Kopiuj JSON` (z powiadomieniem tooltip "Skopiowano do schowka!").
  - Przycisk `Pobierz .json` (generuje i pobiera plik o nazwie `<nazwa_pliku>-insight.json`).

### 3.6. Historia Ostatnich Analiz (F-09 SHOULD)
- **Komponent**: `AnalysisHistoryDrawer`
- Przechowywanie w `localStorage` ostatnich 5 analiz (nazwa pliku, data, typ dokumentu, kwoty).
- Możliwość natychmiastowego przywrócenia wyniku bez ponownego wywoływania API.

---

## 4. Wytyczne Responsywności & Dostępności (A11y)

- **Minimalna szerokość**: Płynny układ od `360px` (smartfony) do `1920px+` (monitory ultrawide).
- **Nawigacja klawiaturą**:
  - Wszystkie interaktywne elementy (`<button>`, `<input>`, `<a>`) posiadają widoczny obrys `focus-visible: 2px solid var(--accent-primary)`.
  - Obsługa klawiszy `Tab`, `Shift+Tab`, `Enter`, `Space` oraz `Escape` (zamykanie widoków modalnych/historii).
- **Dostępność dla czytników ekranu**:
  - Atrybuty `aria-live="polite"` dla paska postępu i komunikatów o błędach.
  - Etykiety `aria-label` dla przycisków ikonowych (kopiowanie, pobieranie, zamknięcie).
