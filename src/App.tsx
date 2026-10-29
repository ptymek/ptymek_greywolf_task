import { useCallback, useRef, useState } from 'react';
import { Braces, FileText, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { Header } from './components/Header';
import { FileUploadDropzone } from './components/FileUploadDropzone';
import { ProcessingProgress } from './components/ProcessingProgress';
import { ErrorBanner } from './components/ErrorBanner';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { AnalysisHistory } from './components/AnalysisHistory';
import { analyzeDocument } from './api/client';
import { FILE_ERRORS, hasPdfHeader, validateFileMeta } from './lib/fileValidation';
import { buildDocumentText, type ExtractedDocument } from './lib/pdfText';
import {
  clearHistory,
  createHistoryId,
  loadHistory,
  saveToHistory,
  type HistoryEntry,
} from './lib/history';
import { DEMO_HISTORY_ENTRY } from './lib/demoData';

type View =
  | { kind: 'idle' }
  | { kind: 'processing'; step: number; detail: string }
  | { kind: 'error'; message: string; retryable: boolean }
  | { kind: 'success'; entry: HistoryEntry };

const KNOWN_ERRORS = new Set(['ApiError', 'PdfExtractionError']);

/**
 * Funkcja zamienia błąd na komunikat dla użytkownika.
 * Dla błędów ApiError i PdfExtractionError funkcja zwraca ich polski komunikat.
 * Dla innych błędów funkcja zwraca ogólny komunikat. Szczegóły techniczne nie trafiają do UI.
 *
 * Wejście: err – błąd z bloku catch (unknown).
 * Wyjście: komunikat po polsku (string).
 */
function toUserMessage(err: unknown): string {
  if (err instanceof Error && KNOWN_ERRORS.has(err.name)) return err.message;
  return 'Wystąpił nieoczekiwany błąd podczas przetwarzania dokumentu.';
}

/**
 * Komponent główny aplikacji. Komponent zarządza maszyną stanów UI (F-06).
 * Stany: idle (pusty), processing (ładowanie), error (błąd), success (wynik).
 * Komponent przechowuje wybrany plik i wyekstrahowany tekst dla ponownej próby.
 * Komponent przechowuje historię analiz (F-09).
 *
 * Wejście: brak (props).
 * Wyjście: element React z całą aplikacją (JSX.Element).
 */
export default function App() {
  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('demo=true')) {
      return { kind: 'success', entry: DEMO_HISTORY_ENTRY };
    }
    return { kind: 'idle' };
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const loaded = loadHistory();
    if (
      loaded.length === 0 &&
      typeof window !== 'undefined' &&
      window.location.search.includes('demo=true')
    ) {
      return [DEMO_HISTORY_ENTRY];
    }
    return loaded;
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef<File | null>(null);
  const extractedRef = useRef<ExtractedDocument | null>(null);
  const runIdRef = useRef(0);

  /**
   * Funkcja wykonuje cały proces analizy pliku (4 etapy UI).
   *   Etap 0: funkcja sprawdza bajty "%PDF-".
   *   Etap 1: funkcja odczytuje tekst (extractPdfText, ładowane na żądanie).
   *   Etap 2: funkcja wysyła tekst do proxy (analyzeDocument).
   *   Etap 3: funkcja pokazuje walidację schematu.
   * Po sukcesie funkcja zapisuje wynik w historii i pokazuje wynik.
   * Gdy cached ma wartość, funkcja pomija etapy 0–1 (ponowna próba bez odczytu pliku).
   * Funkcja ignoruje wynik starego przebiegu, gdy użytkownik zaczął nowy.
   *
   * Wejście:
   *   - file – wybrany plik PDF (File),
   *   - cached – tekst z poprzedniej ekstrakcji albo null (ExtractedDocument | null).
   * Wyjście: Promise<void>. Funkcja zmienia stan view.
   */
  const runPipeline = useCallback(async (file: File, cached: ExtractedDocument | null) => {
    const runId = ++runIdRef.current;
    /**
     * Funkcja sprawdza, czy ten przebieg jest nadal aktualny.
     * Wejście: brak. Wyjście: true, gdy nie zaczął się nowy przebieg (boolean).
     */
    const isCurrent = () => runId === runIdRef.current;
    /**
     * Funkcja ustawia etap i komunikat postępu, gdy przebieg jest aktualny.
     * Wejście: step – numer etapu 0–3 (number); detail – komunikat (string).
     * Wyjście: brak.
     */
    const progress = (step: number, detail: string) => {
      if (isCurrent()) setView({ kind: 'processing', step, detail });
    };

    try {
      let extracted = cached;
      if (!extracted) {
        progress(0, 'Weryfikacja formatu i rozmiaru pliku…');
        const buffer = await file.arrayBuffer();
        if (!hasPdfHeader(new Uint8Array(buffer, 0, Math.min(5, buffer.byteLength)))) {
          setView({ kind: 'error', message: FILE_ERRORS.badHeader, retryable: false });
          return;
        }

        progress(1, 'Uruchamianie silnika pdf.js…');
        const { extractPdfText } = await import('./lib/pdfExtractor');
        extracted = await extractPdfText(buffer, file.name, {
          onProgress: (msg) => progress(1, msg),
        });
        extractedRef.current = extracted;
      }

      progress(
        2,
        `Analiza AI (${extracted.totalPages} str.) – na darmowym modelu zwykle 30–90 sekund…`,
      );
      const { result, meta } = await analyzeDocument(
        {
          fileName: extracted.fileName,
          totalPages: extracted.totalPages,
          extractedText: buildDocumentText(extracted.pages),
        },
        () => progress(3, 'Walidacja odpowiedzi względem schematu (Zod)…'),
      );
      if (!isCurrent()) return;

      const entry: HistoryEntry = {
        id: createHistoryId(),
        analyzedAt: new Date().toISOString(),
        result,
        meta,
        emptyPages: extracted.emptyPages,
        ocrPages: extracted.ocrPages,
      };
      setHistory(saveToHistory(entry));
      setView({ kind: 'success', entry });
    } catch (err) {
      if (!isCurrent()) return;
      setView({ kind: 'error', message: toUserMessage(err), retryable: true });
    }
  }, []);

  /**
   * Funkcja obsługuje plik wybrany przez użytkownika.
   * Funkcja sprawdza rozszerzenie, typ MIME i rozmiar (validateFileMeta).
   * Dla błędnego pliku funkcja pokazuje błąd bez przycisku ponowienia.
   * Dla poprawnego pliku funkcja uruchamia runPipeline.
   *
   * Wejście: file – plik z dropzone (File).
   * Wyjście: brak.
   */
  const handleFile = useCallback(
    (file: File) => {
      const check = validateFileMeta(file);
      fileRef.current = null;
      extractedRef.current = null;
      if (!check.ok) {
        setView({ kind: 'error', message: check.error, retryable: false });
        return;
      }
      fileRef.current = file;
      void runPipeline(file, null);
    },
    [runPipeline],
  );

  /**
   * Funkcja ponawia analizę po błędzie (przycisk "Spróbuj ponownie").
   * Funkcja używa zapisanego pliku i zapisanego tekstu.
   * Użytkownik nie musi ponownie wybierać pliku.
   *
   * Wejście: brak. Wyjście: brak.
   */
  const handleRetry = useCallback(() => {
    const file = fileRef.current;
    if (file) void runPipeline(file, extractedRef.current);
  }, [runPipeline]);

  /**
   * Funkcja przywraca stan pusty (idle).
   * Funkcja usuwa zapisany plik i tekst.
   * Funkcja unieważnia trwający przebieg analizy.
   *
   * Wejście: brak. Wyjście: brak.
   */
  const reset = useCallback(() => {
    runIdRef.current++;
    fileRef.current = null;
    extractedRef.current = null;
    setView({ kind: 'idle' });
  }, []);

  /**
   * Funkcja zamyka panel historii.
   * Wejście: brak. Wyjście: brak.
   */
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const file = fileRef.current;

  return (
    <div className="app">
      <Header historyCount={history.length} onOpenHistory={() => setHistoryOpen(true)} />

      <main>
        {(view.kind === 'idle' || view.kind === 'error') && (
          <>
            <div className="hero">
              <h1>Zamień PDF w podsumowanie i dane JSON</h1>
              <p>
                Wgraj umowę, fakturę, ofertę lub raport. W kilka sekund otrzymasz podsumowanie,
                kluczowe punkty, podmioty, kwoty i daty – gotowe do pobrania jako plik JSON.
              </p>
            </div>

            {view.kind === 'error' && (
              <div style={{ marginBottom: 16 }}>
                <ErrorBanner
                  message={view.message}
                  onRetry={view.retryable && file ? handleRetry : undefined}
                  onReset={reset}
                />
              </div>
            )}

            <FileUploadDropzone onFile={handleFile} />

            <div style={{ textAlign: 'center', marginTop: '-0.25rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  saveToHistory(DEMO_HISTORY_ENTRY);
                  setHistory(loadHistory());
                  setView({ kind: 'success', entry: DEMO_HISTORY_ENTRY });
                }}
              >
                <Sparkles size={14} aria-hidden="true" />
                Załaduj przykładową analizę (Umowa 14/2026)
              </button>
            </div>

            <div className="notice" role="note">
              <Lock size={16} aria-hidden="true" />
              <span>
                <strong>Plik trafia do API AI.</strong> Tekst odczytany z PDF jest przesyłany przez
                nasz serwer proxy do modelu językowego (OpenRouter) w celu analizy. Nie wgrywaj
                dokumentów zawierających dane wrażliwe. Historia wyników jest zapisywana tylko w tej
                przeglądarce.
              </span>
            </div>

            <div className="features">
              <div className="feature">
                <h3>
                  <FileText size={16} aria-hidden="true" /> Odczyt PDF w przeglądarce
                </h3>
                <p>Tekst wyodrębniany lokalnie przez pdf.js; skany odczytywane przez OCR.</p>
              </div>
              <div className="feature">
                <h3>
                  <Sparkles size={16} aria-hidden="true" /> Analiza AI
                </h3>
                <p>Podsumowanie w 3–5 zdaniach w języku dokumentu, bez zgadywania faktów.</p>
              </div>
              <div className="feature">
                <h3>
                  <Braces size={16} aria-hidden="true" /> Zwalidowany JSON
                </h3>
                <p>
                  Daty ISO 8601, waluty ISO 4217 – wynik sprawdzany schematem przed wyświetleniem.
                </p>
              </div>
              <div className="feature">
                <h3>
                  <ShieldCheck size={16} aria-hidden="true" /> Odporność na prompt injection
                </h3>
                <p>
                  Treść PDF to dane, nie polecenia – instrukcje ukryte w dokumencie są ignorowane.
                </p>
              </div>
            </div>
          </>
        )}

        {view.kind === 'processing' && file && (
          <ProcessingProgress
            fileName={file.name}
            fileSize={file.size}
            currentStep={view.step}
            detail={view.detail}
          />
        )}

        {view.kind === 'success' && (
          <AnalysisDashboard
            result={view.entry.result}
            meta={view.entry.meta}
            emptyPages={view.entry.emptyPages}
            ocrPages={view.entry.ocrPages}
            onReset={reset}
          />
        )}
      </main>

      <footer className="footer">
        PDF Insight · zadanie rekrutacyjne Vibe Coder – Greywolf Group ·{' '}
        <a href="https://github.com/ptymek/ptymek_greywolf_task" target="_blank" rel="noreferrer">
          kod źródłowy
        </a>
      </footer>

      <AnalysisHistory
        open={historyOpen}
        entries={history}
        onClose={closeHistory}
        onClear={() => {
          clearHistory();
          setHistory([]);
        }}
        onSelect={(entry) => {
          runIdRef.current++;
          setView({ kind: 'success', entry });
          setHistoryOpen(false);
        }}
      />
    </div>
  );
}
