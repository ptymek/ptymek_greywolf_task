# Software Bill of Materials (SBOM) — PDF Insight

Dokument identyfikuje wszystkie komponenty składowe, biblioteki zewnętrzne, wersje oraz licencje oprogramowania wykorzystanego w aplikacji **PDF Insight**, zgodnie z normami bezpieczeństwa łańcucha dostaw oprogramowania (Supply Chain Security).

Format maszynowy: [`sbom.json`](file:///c:/Users/T0248638/Documents/GitHub/ptymek_greywolf_task/sbom.json) (CycloneDX 1.5).

---

## 1. Wykaz Komponentów Środowiska Uruchomieniowego (Runtime)

| Nazwa pakietu | Wersja | Licencja | Przeznaczenie |
|---|---|---|---|
| **react** | `^18.3.1` | MIT | Rdzeń biblioteki interfejsu użytkownika (SPA). |
| **react-dom** | `^18.3.1` | MIT | Renderer DOM dla React. |
| **pdfjs-dist** | `^4.10.38` | Apache-2.0 | Ekstrakcja tekstu i stron z plików PDF w przeglądarce. |
| **zod** | `^3.24.1` | MIT | Walidacja schematu JSON z sekcji 04 i bezpieczeństwo typów. |
| **lucide-react** | `^0.460.0` | ISC | Zestaw minimalistycznych wektorowych ikon UI. |

---

## 2. Wykaz Narzędzi Deweloperskich i Testowych (Dev / Build)

| Nazwa pakietu | Wersja | Licencja | Przeznaczenie |
|---|---|---|---|
| **vite** | `^6.0.7` | MIT | Bundler i serwer deweloperski o wysokiej wydajności. |
| **typescript** | `^5.7.3` | Apache-2.0 | Statyczne typowanie w trybie `strict`. |
| **vitest** | `^2.1.8` | MIT | Środowisko testów automatycznych (jednostkowe, walidacyjne, bezpieczeństwa). |
| **@types/react** | `^18.3.18` | MIT | Definicje typów TypeScript dla React. |
| **@types/react-dom** | `^18.3.5` | MIT | Definicje typów TypeScript dla ReactDOM. |

---

## 3. Zgodność Licencyjna & Analiza Podatności

- Wszystkie użyte biblioteki podlegają permissive open-source licenses (MIT, Apache-2.0, ISC).
- Brak licencji copyleft (GPL/AGPL), co gwarantuje pełną swobodę komercyjną rozwiązania.
- Żadna z bibliotek nie wprowadza bezpośrednich zależności od niebezpiecznych eval/native binary bindings.
- Ekstrakcja tekstu z PDF wykonywana jest w piaskownicy (Web Worker), co izoluje potencjalne uszkodzone strumienie PDF przed zawieszeniem głównego wątku UI.
