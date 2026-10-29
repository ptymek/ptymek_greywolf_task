# Software Bill of Materials (SBOM) — PDF Insight

Dokument identyfikuje komponenty składowe, biblioteki zewnętrzne, wersje oraz licencje oprogramowania wykorzystanego w aplikacji **PDF Insight**.

Format maszynowy: [`sbom.json`](./sbom.json) (CycloneDX 1.5, wygenerowany z `package-lock.json` poleceniem `npm sbom --sbom-format=cyclonedx --omit=dev` — zawiera również zależności przechodnie).

---

## 1. Komponenty środowiska uruchomieniowego (Runtime)

| Pakiet | Wersja (lockfile) | Licencja | Przeznaczenie |
|---|---|---|---|
| **react** | 18.3.1 | MIT | Rdzeń biblioteki interfejsu użytkownika (SPA). |
| **react-dom** | 18.3.1 | MIT | Renderer DOM dla React. |
| **pdfjs-dist** | 4.10.38 | Apache-2.0 | Ekstrakcja tekstu z PDF w przeglądarce (Web Worker). |
| **zod** | 3.25.x | MIT | Walidacja schematu z sekcji 04 (frontend + proxy). |
| **lucide-react** | 0.460.0 | ISC | Ikony UI. |
| **tesseract.js** | 5.1.1 | Apache-2.0 | OCR stron bez warstwy tekstowej (F-10), ładowany leniwie. |

> **Zasoby pobierane w runtime przez tesseract.js:** rdzeń WASM i modele językowe `pol`/`eng` są pobierane z CDN (jsDelivr / tessdata) **tylko** gdy dokument zawiera skan. Obraz strony nie opuszcza przeglądarki — OCR działa lokalnie.

## 2. Backend (Cloudflare Worker)

Worker (`api/worker.ts`) jest bundlowany z tych samych źródeł (`api/proxy.ts`, `src/lib/*`) i zależy wyłącznie od **zod**. Klucz API przechowywany jest jako sekret Workera.

## 3. Narzędzia deweloperskie i testowe (Dev / Build)

| Pakiet | Wersja | Licencja | Przeznaczenie |
|---|---|---|---|
| **vite** | 6.4.x | MIT | Bundler i serwer deweloperski (z lokalnym proxy `/api/analyze`). |
| **typescript** | 5.9.x | Apache-2.0 | Statyczne typowanie w trybie `strict`. |
| **vitest** | 3.2.x | MIT | Testy jednostkowe (schemat, bezpieczeństwo, proxy, chunking, historia). |
| **eslint** + **typescript-eslint** | 9.x / 8.x | MIT | Lint (`no-explicit-any`, `no-console`, zakaz `dangerouslySetInnerHTML`). |
| **prettier** | 3.x | MIT | Formatowanie kodu. |
| **yaml** | 2.x | ISC | Parsowanie `openapi.yaml` w teście zgodności specyfikacji z kodem. |
| **@redocly/cli** (przez `npx`, nie w `package.json`) | 1.x | MIT | Walidacja specyfikacji OpenAPI (`npm run openapi:lint`). |
| **@vitejs/plugin-react**, **eslint-plugin-react-hooks**, **@types/*** | — | MIT | Integracja React / typy. |
| **wrangler** (przez `npx`, nie w `package.json`) | 4.x | MIT OR Apache-2.0 | Wdrożenie Workera na Cloudflare. |

## 4. Zgodność licencyjna

- Wszystkie biblioteki mają licencje permisywne (MIT, Apache-2.0, ISC); brak licencji copyleft (GPL/AGPL).
- Ekstrakcja PDF działa w Web Workerze, co izoluje przetwarzanie potencjalnie uszkodzonych plików od wątku UI.
- `npm audit` / Dependabot zalecane do bieżącego monitorowania podatności.
