# Wdrożenie PDF Insight (GitHub Pages + Cloudflare Worker)

Aplikacja składa się z dwóch części, które wdrażasz osobno:

| Część | Gdzie | Co zawiera |
|---|---|---|
| **Frontend (SPA)** | GitHub Pages – automatycznie przez GitHub Actions | React, pdf.js, UI. **Bez klucza API.** |
| **Backend proxy** | Cloudflare Workers (darmowy plan) – jednorazowo z terminala | `api/worker.ts` + klucz OpenRouter jako sekret |

Kolejność ma znaczenie: **najpierw Worker** (potrzebujesz jego adresu), **potem GitHub Pages**.

---

## 0. Wymagania

- **Node.js 22 LTS**: <https://nodejs.org/> (instalator `.msi`). Po instalacji otwórz nowy terminal i sprawdź `node -v`.
- Konto **GitHub** (`ptymek`) oraz darmowe konto **Cloudflare**: <https://dash.cloudflare.com/sign-up>.
- Klucz OpenRouter z pliku `api_key.txt`. Plik jest ignorowany przez git i **nigdy go nie commituj**.

```bash
cd C:\Users\T0248638\Documents\GitHub\ptymek_greywolf_task
npm install
npm run lint && npm run typecheck && npm test     # wszystko musi być zielone
```

---

## 1. Kontrola bezpieczeństwa przed pierwszym pushem (obowiązkowo)

Klucz w historii Git oznacza **dyskwalifikację**. Sprawdź:

```bash
git status --short                                  # api_key.txt i .env.local NIE mogą się tu pojawić
git check-ignore -v api_key.txt .env.local          # obie ścieżki muszą być wypisane jako ignorowane
git ls-files | grep -Ei "api_key|\.env$|\.env\.local|\.dev\.vars"   # wynik musi być pusty
git log -p --all | grep -c "sk-or-v1-"              # musi być 0
```

Jeśli którakolwiek kontrola zawiedzie: **nie pushuj**. Usuń plik z indeksu (`git rm --cached <plik>`). Jeśli klucz trafił już do commita, unieważnij go w <https://openrouter.ai/settings/keys> i wygeneruj nowy.

---

## 2. Commity (Conventional Commits)

Jeśli zmiany nie są jeszcze zacommitowane, podziel je na kilka logicznych commitów:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json eslint.config.js .prettierrc.json .prettierignore .gitignore .env.example
git commit -m "chore: configure Vite, strict TypeScript, ESLint and Prettier"

git add src/lib api wrangler.toml
git commit -m "feat(core): add PDF extraction, OCR fallback, chunking and Cloudflare Worker proxy"

git add index.html public src/main.tsx src/App.tsx src/styles.css src/vite-env.d.ts src/components src/api vite.config.ts
git commit -m "feat(ui): implement TypeUI dashboard, upload, progress, error and history views"

git add tests scripts
git commit -m "test: extend Vitest suite (proxy, CORS, retry, chunking, history) and live e2e script"

git add .github
git commit -m "ci: lint, format, typecheck, test, build and deploy to GitHub Pages"

git add README.md AI_LOG.md TEST_SUITE.md architecture.md DESIGN.md SBOM.md sbom.json DEPLOY.md FUNCTIONS.md openapi.yaml CLAUDE.md
git commit -m "docs: update README, AI log, test suite, SBOM and deployment guide"

git status     # powinno być czysto (poza ignorowanymi plikami)
```

---

## 3. Backend: Cloudflare Worker

```bash
npx wrangler login                 # otworzy przeglądarkę, zaloguj się do Cloudflare
npx wrangler deploy                # buduje api/worker.ts i wdraża Worker "pdf-insight-proxy"
```

Na końcu `wrangler` wypisze adres, np. `https://pdf-insight-proxy.<twoja-subdomena>.workers.dev`. **Zapisz go.**

Dodaj klucz jako **sekret**. Nie trafia on wtedy do żadnego pliku:

```bash
npx wrangler secret put OPENROUTER_API_KEY
# wklej klucz z api_key.txt i zatwierdź Enterem
```

Test (oczekiwane: `ok`, a następnie `403` dla obcej domeny):

```bash
curl https://pdf-insight-proxy.<subdomena>.workers.dev/health
curl -i -X POST -H "Origin: https://evil.example" https://pdf-insight-proxy.<subdomena>.workers.dev/api/analyze
```

> `ALLOWED_ORIGINS` w `wrangler.toml` zawiera `https://ptymek.github.io`. Origin nie ma ścieżki, więc **nie** dopisuj `/ptymek_greywolf_task`. Jeśli zmienisz nazwę użytkownika GitHub, zaktualizuj tę wartość i ponów `npx wrangler deploy`.

---

## 4. GitHub: repozytorium i ustawienia

1. Utwórz **publiczne** repozytorium <https://github.com/new>:
   - Repository name: **`ptymek_greywolf_task`** (nazwa = ścieżka demo)
   - Visibility: **Public**
   - **Nie** zaznaczaj „Add README / .gitignore / license” (repo musi być puste)

2. Podłącz repo i wypchnij kod:

   ```bash
   git remote add origin https://github.com/ptymek/ptymek_greywolf_task.git
   git branch -M main
   git push -u origin main
   ```

   Pierwszy run workflow **zakończy się błędem** w kroku „Verify backend URL is configured”. To oczekiwane, bo zmienna nie jest jeszcze ustawiona.

3. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**.

4. **Settings → Secrets and variables → Actions → zakładka *Variables* → New repository variable**:
   - Name: `VITE_API_URL`
   - Value: `https://pdf-insight-proxy.<subdomena>.workers.dev/api/analyze`

   To *Variable*, a nie *Secret*: adres Workera jest publiczny i trafia do bundla. Klucz API zostaje wyłącznie w Cloudflare.

5. **Actions → „CI / CD Pipeline - PDF Insight” → ostatni run → Re-run all jobs** (albo zrób kolejny push).

6. Po zielonym runie demo działa pod adresem **<https://ptymek.github.io/ptymek_greywolf_task/>** (pierwsza publikacja może potrwać 1–2 minuty).

---

## 5. Weryfikacja demo (scenariusz M-10)

1. Otwórz demo w trybie incognito, DevTools → Console/Network: brak błędów 404 (`assets/*.js`, `pdf.worker.min-*.mjs`).
2. Wgraj `Test_PDF_Insight_umowa_14-2026.pdf`:
   - typ `umowa`, data `2026-03-12`, kwoty 184 500 PLN / 12 300 PLN / 8 600 EUR / 890 USD,
   - zielony baner „Wykryto próbę prompt injection…”, a podsumowanie **nie** mówi, że umowa jest nieważna ani że jest warta 1 PLN,
   - informacja o OCR strony 11 (albo o jej pominięciu).
3. Pobierz `.json` i sprawdź, czy otwiera się poprawnie.
4. Odśwież stronę → **Historia** → poprzedni wynik wczytuje się bez wywołania API.

---

## 6. Zrzut ekranu do README

Zrób zrzut ekranu wyników (np. Win + Shift + S) i zapisz jako `docs/screenshot.png`:

```bash
git add docs/screenshot.png
git commit -m "docs: add application screenshot"
git push
```

---

## 7. Rozwiązywanie problemów

| Objaw | Przyczyna / rozwiązanie |
|---|---|
| „Serwer odrzucił żądanie z tej domeny (CORS)” | `ALLOWED_ORIGINS` w `wrangler.toml` nie zawiera originu demo. Popraw i wykonaj `npx wrangler deploy`. |
| „Serwer nie ma skonfigurowanego klucza API” | Brak sekretu: `npx wrangler secret put OPENROUTER_API_KEY`. |
| „Brak konfiguracji adresu backendu (VITE_API_URL)” | Zmienna repozytorium nie była ustawiona podczas builda. Ustaw ją (krok 4.4) i uruchom ponownie workflow. |
| Biała strona, 404 dla `/assets/...` | Repo ma inną nazwę niż ścieżka. Workflow ustawia `base` z nazwy repo, więc uruchom go ponownie po zmianie nazwy. |
| „Branch main is not allowed to deploy to github-pages” | Settings → Environments → `github-pages` → Deployment branches: dodaj `main`. |
| „Przekroczono limit żądań” / HTTP 429 z OpenRouter | Dzienny limit darmowych modeli (50/dzień) albo chwilowe przeciążenie modelu. Odczekaj chwilę. Fallbacki w `OPENROUTER_MODEL` pomagają przy przeciążeniu. |
| Analiza trwa > 30 s | Ograniczenie darmowych modeli (zmierzone 37–78 s). Opcjonalnie: doładuj konto OpenRouter i ustaw szybki płatny model w `OPENROUTER_MODEL` (`wrangler.toml`), a potem `npx wrangler deploy`. |

---

## 8. Utrzymanie przez 14 dni (wymóg briefu)

- Klucz OpenRouter ma datę wygaśnięcia. Sprawdź ją w <https://openrouter.ai/settings/keys>. Jeśli wygasa przed końcem rekrutacji, wygeneruj nowy i wykonaj ponownie `npx wrangler secret put OPENROUTER_API_KEY`.
- Logi Workera na żywo: `npx wrangler tail`.
