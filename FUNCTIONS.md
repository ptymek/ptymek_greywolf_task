# Katalog funkcji systemu PDF Insight (FUNCTIONS.md)

Dokument opisuje wszystkie nazwane funkcje i komponenty w kodzie: co robi każda funkcja, co przyjmuje i co zwraca.
Ten sam opis jest w komentarzu nad każdą funkcją w kodzie.

**Konwencja opisu (ASD-STE100, wersja polska):**
- Jedno zdanie opisuje jedną czynność. Zdanie ma maks. ok. 20 słów.
- Strona czynna i czas teraźniejszy („Funkcja sprawdza…”, a nie „Jest sprawdzane…”).
- Stałe terminy: **Funkcja** / **Komponent**, **Wejście**, **Wyjście**, **Błędy**, **Uwaga**. Bez synonimów.
- „Uwaga” oznacza ograniczenie, o którym musi wiedzieć użytkownik funkcji.

Anonimowe funkcje zwrotne (np. `onClick={() => …}` w JSX, `.map((x) => …)`, `refine((val) => …)` w Zod) nie mają osobnych opisów. Opisuje je komentarz funkcji, w której występują.

---

## Spis treści

1. [Przepływ danych](#1-przepływ-danych)
2. [Walidacja i schemat – `src/lib/schema.ts`](#2-walidacja-i-schemat--srclibschemats)
3. [Bezpieczeństwo promptu – `src/lib/prompt.ts`](#3-bezpieczeństwo-promptu--srclibpromptts)
4. [Walidacja pliku – `src/lib/fileValidation.ts`](#4-walidacja-pliku--srclibfilevalidationts)
5. [Tekst PDF – `src/lib/pdfText.ts`](#5-tekst-pdf--srclibpdftextts)
6. [Ekstrakcja PDF – `src/lib/pdfExtractor.ts`](#6-ekstrakcja-pdf--srclibpdfextractorts)
7. [OCR – `src/lib/ocr.ts`](#7-ocr--srclibocrts)
8. [Długie dokumenty – `src/lib/chunking.ts`](#8-długie-dokumenty--srclibchunkingts)
9. [Historia – `src/lib/history.ts`](#9-historia--srclibhistoryts)
10. [Formatowanie – `src/lib/format.ts`](#10-formatowanie--srclibformatts)
11. [Klient API – `src/api/client.ts`, `src/api/mock.ts`](#11-klient-api--srcapiclientts-srcapimockts)
12. [Backend proxy – `api/proxy.ts`](#12-backend-proxy--apiproxyts)
13. [Worker i konfiguracja – `api/worker.ts`, `vite.config.ts`](#13-worker-i-konfiguracja--apiworkerts-viteconfigts)
14. [Aplikacja – `src/App.tsx`](#14-aplikacja--srcapptsx)
15. [Komponenty UI – `src/components/`](#15-komponenty-ui--srccomponents)
16. [Funkcje pomocnicze testów – `tests/`](#16-funkcje-pomocnicze-testów--tests)

---

## 1. Przepływ danych

```
PRZEGLĄDARKA (GitHub Pages)
FileUploadDropzone ──onFile──► App.handleFile ──► validateFileMeta
                                     │
                                     ▼
                              App.runPipeline
                                ├─ hasPdfHeader
                                ├─ extractPdfText ──► joinTextItems, isPageEmpty
                                │                 └─► ocrPage ──► ocrCanvas ──► getWorker, withTimeout
                                ├─ buildDocumentText ──► PAGE_MARKER
                                ├─ analyzeDocument (client) ──► resolveApiUrl, validateAnalysisResult
                                └─ saveToHistory ──► loadHistory
                                     │ POST /api/analyze
                                     ▼
BACKEND (Cloudflare Worker / serwer Vite dev)
worker.fetch / devApiProxy ──► handleAnalyzeRequest
                                 ├─ parseAllowedOrigins, isOriginAllowed, getCorsHeaders
                                 ├─ checkRateLimit, clientIp
                                 └─ analyzeDocument (proxy)
                                      ├─ detectPromptInjectionSignatures ──► normalizeForDetection
                                      ├─ splitIntoChunks
                                      ├─ callOpenRouterWithRetry ──► withSingleRetry, retryHint
                                      │     ├─ buildUserPrompt ──► sanitizeInputText, sanitizeMetadata
                                      │     ├─ chatCompletion ──► parseModelList  ──► OpenRouter API
                                      │     ├─ extractJsonObject
                                      │     ├─ validateAnalysisResult ──► countSentences
                                      │     └─ detectInjectionEffects
                                      └─ mergeSummaries ──► buildMergePrompt;  mergeChunkResults ──► uniqueBy, norm
```

---

## 2. Walidacja i schemat – `src/lib/schema.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `countSentences` | Funkcja liczy zdania w tekście. Funkcja dzieli tekst po „.”, „!”, „?”, „…”, gdy dalej jest spacja i wielka litera albo cyfra. Skróty („sp. z o.o.”, „r.”) nie kończą zdania. | `text: string` | `number` – liczba zdań |
| `validateAnalysisResult` | Funkcja sprawdza dane schematem z sekcji 04 (Zod). Funkcja nie zgłasza wyjątku. Funkcja zwraca błędy jako tekst. | `data: unknown` – np. odpowiedź AI | `{ success, data?: PdfAnalysisResult, error?: string }` |

Schematy Zod (nie są funkcjami, ale definiują reguły): `DocumentMetadataSchema`, `EntitiesSchema`, `AmountEntrySchema`, `DateEntrySchema`, `PdfAnalysisResultSchema` (podsumowanie 2–6 zdań, czyli 3–5 z tolerancją ±1, oraz 3–7 kluczowych punktów), `AnalysisMetaSchema`, `ProxyResponseSchema`.

---

## 3. Bezpieczeństwo promptu – `src/lib/prompt.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `buildUserPrompt` | Funkcja tworzy prompt użytkownika. Funkcja umieszcza tekst dokumentu między tagami `<untrusted_document_content>`. Dla fragmentu funkcja dodaje jego numer. | `payload: PromptPayload`, `chunk?: ChunkInfo` | `string` – prompt |
| `buildMergePrompt` | Funkcja tworzy prompt kroku łączenia fragmentów (F-08). Funkcja umieszcza podsumowania i punkty fragmentów między tagami granicznymi. | `parts: {summary, keyPoints}[]` | `string` – prompt |
| `sanitizeInputText` | Funkcja zastępuje tagi graniczne tekstem `[UNTRUSTED_CONTENT_TAG_STRIPPED]`. Tekst dokumentu nie może wyjść poza blok danych. | `text: string` | `string` – bezpieczny tekst |
| `sanitizeMetadata` *(wewn.)* | Funkcja czyści nazwę pliku: usuwa tagi, nowe linie, „<”, „>” i skraca wynik do 200 znaków. | `value: string` | `string` – jedna linia |
| `normalizeForDetection` *(wewn.)* | Funkcja łączy białe znaki w jedną spację i zamienia litery na małe. Wzorce znajdą wtedy zdanie podzielone na linie. | `text: string` | `string` |
| `detectPromptInjectionSignatures` | Funkcja szuka sygnatur ataku **przed** analizą. Wynik służy do telemetrii, do komunikatu w UI i do włączenia kontroli wyniku. Funkcja nie blokuje analizy. | `text: string` | `{ detected: boolean, patterns: string[] }` |
| `detectInjectionEffects` | Funkcja sprawdza **po** analizie, czy model wykonał ukryte polecenie („umowa jest nieważna”, 1 PLN). **Uwaga:** używaj jej tylko wtedy, gdy tekst zawiera sygnatury ataku. | `result: PdfAnalysisResult` | `{ compromised: boolean, reasons: string[] }` |

Stałe: `SYSTEM_SECURITY_PROMPT` (dyrektywa systemowa), `MERGE_SYSTEM_PROMPT` (dyrektywa kroku łączenia).

---

## 4. Walidacja pliku – `src/lib/fileValidation.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `validateFileMeta` | Funkcja sprawdza rozszerzenie `.pdf`, typ MIME i rozmiar (0 B < rozmiar ≤ 10 MB) przed odczytem pliku (F-01). | `file: {name, type, size}` | `{ ok: true }` albo `{ ok: false, error }` |
| `hasPdfHeader` | Funkcja sprawdza, czy plik zaczyna się od bajtów `%PDF-`. Funkcja wykrywa fałszywe rozszerzenie. | `bytes: Uint8Array` | `boolean` |
| `formatBytes` | Funkcja zamienia bajty na tekst w jednostce B, KB albo MB. | `bytes: number` | `string`, np. „10.00 MB” |

---

## 5. Tekst PDF – `src/lib/pdfText.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `isTextItem` *(wewn.)* | Funkcja sprawdza, czy element pdf.js ma pole tekstowe `str` (type guard). | `item: unknown` | `item is TextItemLike` |
| `joinTextItems` | Funkcja łączy elementy tekstu strony. Funkcja dodaje nową linię dla `hasEOL`, a w innym przypadku spację. Funkcja usuwa nadmiarowe spacje (F-02). | `items: unknown[]` | `string` – tekst strony |
| `isPageEmpty` | Funkcja sprawdza, czy strona ma mniej niż 10 znaków bez białych znaków (np. skan). | `text: string` | `boolean` |
| `PAGE_MARKER` | Funkcja tworzy znacznik `--- Strona N ---`. | `n: number` | `string` |
| `buildDocumentText` | Funkcja łączy niepuste strony w jeden tekst. Przed każdą stroną funkcja dodaje znacznik strony. | `pages: PageText[]` | `string` |

---

## 6. Ekstrakcja PDF – `src/lib/pdfExtractor.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `extractPdfText` | Funkcja odczytuje tekst wszystkich stron przez pdf.js (Web Worker). Dla pustych stron funkcja uruchamia OCR z limitem czasu i liczby stron. Funkcja zawsze zwalnia pamięć dokumentu. | `data: ArrayBuffer`, `fileName: string`, `options: ExtractOptions` (`enableOcr`, `ocrBudgetMs`, `maxOcrPages`, `onProgress`) | `Promise<ExtractedDocument>`. **Błędy:** `PdfExtractionError` (plik uszkodzony, hasło, brak tekstu) |
| `ocrPage` *(wewn.)* | Funkcja rysuje stronę na canvas w skali 2 i przekazuje canvas do OCR. Przy błędzie funkcja zwraca `null`. | `pdf`, `pageNumber: number`, `timeoutMs: number` | `Promise<string \| null>` |

---

## 7. OCR – `src/lib/ocr.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `getWorker` *(wewn.)* | Funkcja zwraca jeden wspólny worker tesseract.js. Przy pierwszym wywołaniu funkcja ładuje modele `pol` i `eng`. | brak | `Promise<TesseractWorker>` |
| `withTimeout` *(wewn.)* | Funkcja zwraca wynik operacji albo `null` po przekroczeniu czasu lub po błędzie. **Uwaga:** funkcja nie przerywa operacji. | `promise: Promise<T>`, `ms: number` | `Promise<T \| null>` |
| `ocrCanvas` | Funkcja rozpoznaje tekst na obrazie strony lokalnie w przeglądarce (F-10). | `canvas: HTMLCanvasElement`, `timeoutMs: number` | `Promise<string \| null>` |
| `terminateOcr` | Funkcja zatrzymuje worker OCR i zwalnia pamięć. Funkcja nie zgłasza wyjątku. | brak | `Promise<void>` |

---

## 8. Długie dokumenty – `src/lib/chunking.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `splitIntoChunks` | Funkcja dzieli tekst na fragmenty po granicach stron (F-08). Za długą stronę funkcja tnie na części. | `text: string`, `maxChars = 48 000` | `string[]` |
| `flush` *(wewn., w `splitIntoChunks`)* | Funkcja zapisuje bieżący fragment na listę i czyści bufor. | brak | brak |
| `uniqueBy` *(wewn.)* | Funkcja usuwa powtórzenia według klucza. Funkcja zachowuje pierwsze wystąpienie. | `items: T[]`, `key: (T) => string` | `T[]` |
| `norm` *(wewn.)* | Funkcja tworzy klucz porównania: małe litery, jedna spacja, bez spacji na brzegach. | `s: string` | `string` |
| `mergeChunkResults` | Funkcja łączy wyniki fragmentów w jeden wynik. Funkcja usuwa powtórzenia encji, kwot, dat i słów kluczowych, a daty sortuje. Podsumowanie funkcja bierze z `combined` albo z 1. fragmentu. | `parts: PdfAnalysisResult[]`, `combined?: {summary, keyPoints}` | `PdfAnalysisResult`. **Błędy:** `Error` dla pustej listy |
| `pick` *(wewn., w `mergeChunkResults`)* | Funkcja zwraca pierwszą wartość różną od `null` ze wszystkich fragmentów. | `get: (r) => T \| null` | `T \| null` |

---

## 9. Historia – `src/lib/history.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `defaultStorage` *(wewn.)* | Funkcja zwraca `localStorage` albo `null` (tryb prywatny, brak przeglądarki). | brak | `StorageLike \| null` |
| `loadHistory` | Funkcja odczytuje historię. Funkcja sprawdza każdy wpis schematem Zod i pomija błędne wpisy. Funkcja zwraca maks. 5 wpisów (F-09). | `storage?` | `HistoryEntry[]` |
| `saveToHistory` | Funkcja zapisuje wpis na początku listy, usuwa wpis o tym samym `id` i zachowuje maks. 5 wpisów. | `entry: HistoryEntry`, `storage?` | `HistoryEntry[]` |
| `clearHistory` | Funkcja usuwa całą historię. | `storage?` | `void` |
| `createHistoryId` | Funkcja tworzy unikalny identyfikator (`crypto.randomUUID` albo czas + liczba losowa). | brak | `string` |

---

## 10. Formatowanie – `src/lib/format.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `languageLabel` | Funkcja zamienia kod ISO 639-1 na polską nazwę języka. | `code: string` | `string`, np. „polski (pl)” |
| `formatAmount` | Funkcja formatuje kwotę w polskim formacie waluty. | `value: number`, `currency: string` | `string`, np. „184 500,00 zł” |
| `formatDate` | Funkcja zamienia datę ISO na polski zapis słowny. | `iso: string` | `string`, np. „12 marca 2026” |
| `formatDateTime` | Funkcja zamienia datę i czas ISO na polski format lokalny. | `iso: string` | `string` |
| `formatPageList` | Funkcja zamienia listę numerów stron na tekst. | `pages: number[]` | `string`, np. „4, 11” |

---

## 11. Klient API – `src/api/client.ts`, `src/api/mock.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `resolveApiUrl` | Funkcja wybiera adres proxy: `VITE_API_URL`, w trybie dev `/api/analyze`, w innym przypadku `null`. | brak (`import.meta.env`) | `string \| null` |
| `analyzeDocument` *(klient)* | Funkcja wysyła tekst do proxy, sprawdza kopertę odpowiedzi i ponownie waliduje wynik (podwójna walidacja). Frontend nie zna klucza API. **Uwaga:** funkcja nie powtarza zapytania, bo ponowną próbę wykonuje proxy. | `request: AnalyzeRequest`, `onValidating?: () => void` | `Promise<{ result, meta }>`. **Błędy:** `ApiError` z komunikatem po polsku |
| `buildMockResponse` | Funkcja zwraca testowy wynik bez zapytania do AI (`VITE_USE_MOCK=true`, tylko dev). | `request: AnalyzeRequest` | `Promise<AnalyzeResponse>` |

---

## 12. Backend proxy – `api/proxy.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `checkRateLimit` | Funkcja ogranicza liczbę żądań z IP w oknie 60 s. **Uwaga:** limit działa w pamięci jednej instancji. | `ip: string`, `maxPerMinute = 10` | `boolean` |
| `parseAllowedOrigins` | Funkcja zamienia `ALLOWED_ORIGINS` na listę originów bez końcowego „/”. | `value: string \| undefined` | `string[]` |
| `isOriginAllowed` | Funkcja sprawdza, czy origin jest na liście. Brak nagłówka `Origin` oznacza „niedozwolony”. | `origin: string \| null`, `allowedOrigins: string[]` | `boolean` |
| `getCorsHeaders` | Funkcja tworzy nagłówki CORS. Funkcja dodaje `Access-Control-Allow-Origin` tylko dla dozwolonego originu i nigdy nie używa `*`. | `requestOrigin`, `allowedOrigins` | `Record<string, string>` |
| `UpstreamError` *(konstruktor)* | Funkcja tworzy błąd OpenRouter z kodem HTTP. | `message: string`, `status: number` | obiekt błędu |
| `extractJsonObject` | Funkcja wyodrębnia obiekt JSON z odpowiedzi modelu (usuwa markdown, bierze tekst od `{` do `}`). | `raw: string` | `unknown`. **Błędy:** brak obiektu / błędny JSON |
| `parseModelList` | Funkcja zamienia `OPENROUTER_MODEL` na listę: model główny i modele zapasowe. | `value: string` | `string[]` (min. 1) |
| `chatCompletion` *(wewn.)* | Funkcja wysyła jedno zapytanie do OpenRouter z kluczem w nagłówku, limitem czasu i modelami zapasowymi. | `messages`, `apiKey`, `model`, `timeoutMs` | `Promise<{ content, model }>`. **Błędy:** `UpstreamError` (HTTP, 504) |
| `errorMessage` *(wewn.)* | Funkcja zamienia dowolny błąd na tekst. | `err: unknown` | `string` |
| `withSingleRetry` *(wewn.)* | Funkcja wykonuje operację z **dokładnie 1** ponowną próbą. Druga próba otrzymuje błąd pierwszej. Funkcja nie zgłasza wyjątku. | `attempt: (previousError) => Promise<T>` | `Promise<{ success, data \| error, attempts }>` |
| `retryHint` *(wewn.)* | Funkcja tworzy wiadomość dla modelu z przyczyną odrzucenia poprzedniej odpowiedzi. | `previousError: string \| null` | `ChatMessage[]` (0 lub 1) |
| `callOpenRouterWithRetry` | Funkcja analizuje jeden tekst: prompt → zapytanie → JSON → prawdziwa nazwa pliku i liczba stron → Zod → kontrola skutków ataku. Przy błędzie funkcja wykonuje 1 ponowną próbę. | `payload`, `apiKey`, `modelName`, `options` (`chunk`, `injectionDetected`, `timeoutMs`) | `Promise<{ success, data?, error?, attempts, model }>` |
| `mergeSummaries` *(wewn.)* | Funkcja łączy podsumowania fragmentów przez model AI (1 ponowna próba). Błąd tego kroku nie zatrzymuje analizy. | `parts`, `apiKey`, `model`, `timeoutMs` | `Promise<{summary, keyPoints} \| undefined>` |
| `analyzeDocument` *(proxy)* | Funkcja wykonuje pełną analizę: skrócenie tekstu → detekcja ataku → podział → równoległa analiza → łączenie. | `payload`, `apiKey`, `model`, `timeoutMs` | `Promise<AnalyzeResult>` (`data` + `meta` albo `error` + `status`) |
| `json` *(wewn.)* | Funkcja tworzy odpowiedź HTTP z treścią JSON. | `body`, `status`, `headers` | `Response` |
| `clientIp` *(wewn.)* | Funkcja odczytuje IP z `CF-Connecting-IP` albo `X-Forwarded-For`. | `request: Request` | `string` |
| `handleAnalyzeRequest` | Funkcja obsługuje `/api/analyze`: 403 (origin) → 204 (OPTIONS) → 405 (metoda) → 429 (limit) → 413 (rozmiar) → 500 (brak klucza) → 400 (błędna treść) → analiza. | `request: Request`, `env: ProxyEnv` | `Promise<Response>` |

---

## 13. Worker i konfiguracja – `api/worker.ts`, `vite.config.ts`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `fetch` *(Worker)* | Funkcja kieruje żądanie: `/api/analyze` → `handleAnalyzeRequest`, `/health` → „ok”, inna ścieżka → 404. | `request: Request`, `env: ProxyEnv` | `Promise<Response>` |
| `devApiProxy` | Funkcja tworzy wtyczkę Vite z lokalnym `/api/analyze` (tylko dev). Klucz z `.env.local` zostaje po stronie Node. | `env: Record<string, string>` | `Plugin` |
| `configureServer` *(w `devApiProxy`)* | Funkcja rejestruje middleware, które zamienia żądanie Node na `Request` i wywołuje `handleAnalyzeRequest`. | `server: ViteDevServer` | brak |
| funkcja konfiguracji (`defineConfig`) | Funkcja tworzy konfigurację Vite/Vitest: ścieżka bazowa, podział bundla, testy. | `{ mode }` | `UserConfig` |

---

## 14. Aplikacja – `src/App.tsx`

| Funkcja | Opis | Wejście | Wyjście |
|---|---|---|---|
| `toUserMessage` *(wewn.)* | Funkcja zamienia błąd na komunikat po polsku. Szczegóły techniczne nieznanych błędów nie trafiają do UI. | `err: unknown` | `string` |
| `App` *(komponent)* | Komponent zarządza maszyną stanów UI: `idle` → `processing` → `success` / `error` (F-06). | brak | `JSX.Element` |
| `runPipeline` | Funkcja wykonuje 4 etapy: sygnatura PDF → ekstrakcja → analiza AI → walidacja. Funkcja zapisuje wynik w historii. Z `cached` funkcja pomija odczyt pliku. Funkcja ignoruje wyniki starych przebiegów. | `file: File`, `cached: ExtractedDocument \| null` | `Promise<void>` (zmienia stan) |
| `isCurrent` *(w `runPipeline`)* | Funkcja sprawdza, czy przebieg jest aktualny. | brak | `boolean` |
| `progress` *(w `runPipeline`)* | Funkcja ustawia etap i komunikat postępu. | `step: number`, `detail: string` | brak |
| `handleFile` | Funkcja sprawdza plik i uruchamia `runPipeline`. Dla błędnego pliku funkcja pokazuje błąd bez ponowienia. | `file: File` | brak |
| `handleRetry` | Funkcja ponawia analizę z zapisanym plikiem i tekstem (przycisk „Spróbuj ponownie”). | brak | brak |
| `reset` | Funkcja przywraca stan pusty i unieważnia trwający przebieg. | brak | brak |
| `closeHistory` | Funkcja zamyka panel historii. | brak | brak |

---

## 15. Komponenty UI – `src/components/`

| Komponent / funkcja | Plik | Opis | Wejście (props / parametry) | Wyjście |
|---|---|---|---|---|
| `Header` | `Header.tsx` | Komponent pokazuje logo, informację „Plik trafia do API AI”, przycisk historii i link do repozytorium. | `historyCount`, `onOpenHistory` | `<header>` |
| `FileUploadDropzone` | `FileUploadDropzone.tsx` | Komponent pokazuje strefę wgrywania: przeciągnij i upuść, kliknięcie, Enter/Spacja (F-01). | `onFile`, `disabled?` | element React |
| `openPicker` | `FileUploadDropzone.tsx` | Funkcja otwiera okno wyboru pliku. | brak | brak |
| `handleDrop` | `FileUploadDropzone.tsx` | Funkcja przekazuje upuszczony plik do `onFile`. | `e: DragEvent` | brak |
| `handleKeyDown` | `FileUploadDropzone.tsx` | Funkcja otwiera okno wyboru po Enter/Spacji. | `e: KeyboardEvent` | brak |
| `ProcessingProgress` | `ProcessingProgress.tsx` | Komponent pokazuje 4 etapy analizy, pasek postępu i komunikat (`aria-live`). | `fileName`, `fileSize`, `currentStep`, `detail` | element React |
| `ErrorBanner` | `ErrorBanner.tsx` | Komponent pokazuje błąd z przyciskami „Spróbuj ponownie” i „Wybierz inny plik” (F-06). | `message`, `onRetry?`, `onReset` | element React |
| `AnalysisDashboard` | `AnalysisDashboard.tsx` | Komponent pokazuje karty wyniku i komunikaty: atak wykryty, OCR, pominięte strony. | `result`, `meta?`, `emptyPages`, `ocrPages`, `onReset` | element React |
| `EmptyNote` | `AnalysisDashboard.tsx` | Komponent pokazuje informację o braku danych. | `children: string` | `<p>` |
| `JsonViewer` | `JsonViewer.tsx` | Komponent pokazuje JSON z kolorowaniem i przyciskami kopiowania i pobrania (F-05). | `data`, `fileName` | element React |
| `highlight` | `JsonViewer.tsx` | Funkcja koloruje składnię JSON elementami `<span>`, bez `dangerouslySetInnerHTML`. | `json: string` | `ReactNode[]` |
| `exportFileName` | `JsonViewer.tsx` | Funkcja tworzy bezpieczną nazwę pliku `<nazwa>-insight.json`. | `pdfName: string` | `string` |
| `copy` | `JsonViewer.tsx` | Funkcja kopiuje JSON do schowka i pokazuje komunikat. | brak | `Promise<void>` |
| `download` | `JsonViewer.tsx` | Funkcja pobiera JSON jako plik (Blob + link `download`). | brak | brak |
| `AnalysisHistory` | `AnalysisHistory.tsx` | Komponent pokazuje panel historii (F-09). Escape zamyka panel. Wybór wpisu nie wywołuje AI. | `open`, `entries`, `onSelect`, `onClear`, `onClose` | element React albo `null` |
| `onKey` | `AnalysisHistory.tsx` | Funkcja zamyka panel po klawiszu Escape. | `e: KeyboardEvent` | brak |

---

## 16. Funkcje pomocnicze testów – `tests/`

| Funkcja | Plik | Opis | Wejście | Wyjście |
|---|---|---|---|---|
| `completion` | `proxy.test.ts` | Funkcja tworzy testową odpowiedź OpenRouter. | `content: unknown` | `Response` |
| `analyzeRequest` | `proxy.test.ts` | Funkcja tworzy testowe żądanie do `/api/analyze`. | `body`, `{ origin, ip, method }` | `Request` |
| `entry` | `history.test.ts` | Funkcja tworzy testowy wpis historii. | `id: string` | `HistoryEntry` |
| `MemoryStorage.getItem` / `setItem` / `removeItem` | `history.test.ts` | Funkcje symulują `localStorage` w pamięci. | klucz, wartość | wartość / brak |
| `get` | `openapi.test.ts` | Funkcja odczytuje wartość z dokumentu OpenAPI według ścieżki kluczy. | `path: string[]` | `unknown` |
| `schema` | `openapi.test.ts` | Funkcja odczytuje element z `components.schemas`. | `name: string`, `...rest: string[]` | `unknown` |

Kontrakt HTTP backendu (endpointy, kody odpowiedzi, schematy) opisuje [`openapi.yaml`](./openapi.yaml).

Przypadki testowe (AUTO-01…21) opisuje [`TEST_SUITE.md`](./TEST_SUITE.md).
