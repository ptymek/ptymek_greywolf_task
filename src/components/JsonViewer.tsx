import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Braces, Check, Copy, Download } from 'lucide-react';

interface JsonViewerProps {
  data: unknown;
  fileName: string;
}

const TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/**
 * Funkcja koloruje składnię tekstu JSON.
 * Funkcja dzieli tekst na tokeny: klucz, tekst, liczba, true/false/null.
 * Każdy token funkcja umieszcza w elemencie <span> z klasą CSS.
 * Funkcja tworzy elementy React. Funkcja nie używa dangerouslySetInnerHTML (ochrona XSS).
 *
 * Wejście: json – sformatowany tekst JSON (string).
 * Wyjście: lista węzłów React: teksty i elementy <span> (ReactNode[]).
 */
function highlight(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of json.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(json.slice(last, index));
    const [full, str, colon, literal, num] = match;
    if (str !== undefined) {
      nodes.push(
        <span key={key++} className={colon ? 'tok-key' : 'tok-string'}>
          {str}
        </span>,
      );
      if (colon) nodes.push(colon);
    } else if (literal !== undefined) {
      nodes.push(
        <span key={key++} className="tok-literal">
          {literal}
        </span>,
      );
    } else if (num !== undefined) {
      nodes.push(
        <span key={key++} className="tok-number">
          {num}
        </span>,
      );
    }
    last = index + full.length;
  }
  if (last < json.length) nodes.push(json.slice(last));
  return nodes;
}

/**
 * Funkcja tworzy nazwę pliku eksportu JSON.
 * Funkcja usuwa rozszerzenie ".pdf".
 * Funkcja zastępuje znakiem "_" każdy znak inny niż litera, cyfra, ".", "_" i "-".
 * Dla pustej nazwy funkcja używa "dokument".
 *
 * Wejście: pdfName – nazwa pliku PDF (string).
 * Wyjście: nazwa pliku, np. "umowa-insight.json" (string).
 */
export function exportFileName(pdfName: string): string {
  const base = pdfName.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'dokument';
  return `${base}-insight.json`;
}

/**
 * Komponent pokazuje wynik jako JSON z kolorowaniem składni (F-05).
 * Komponent ma przyciski "Kopiuj JSON" i "Pobierz .json".
 * Komponent pokazuje komunikat statusu przez 2,5 s.
 *
 * Wejście (props): data – dane do pokazania (unknown); fileName – nazwa pliku PDF (string).
 * Wyjście: element React (JSX.Element).
 */
export function JsonViewer({ data, fileName }: JsonViewerProps) {
  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const highlighted = useMemo(() => highlight(json), [json]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(t);
  }, [status]);

  /**
   * Funkcja kopiuje tekst JSON do schowka.
   * Funkcja pokazuje komunikat "Skopiowano do schowka!" albo komunikat błędu.
   * Wejście: brak. Wyjście: Promise<void>.
   */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setStatus('Skopiowano do schowka!');
    } catch {
      setStatus('Nie udało się skopiować – zaznacz tekst ręcznie.');
    }
  };

  /**
   * Funkcja pobiera wynik jako plik .json.
   * Funkcja tworzy obiekt Blob i tymczasowy link <a download>.
   * Po kliknięciu funkcja usuwa link i zwalnia adres URL.
   * Wejście: brak. Wyjście: brak (przeglądarka zapisuje plik <nazwa>-insight.json).
   */
  const download = () => {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(fileName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Pobrano plik .json');
  };

  return (
    <section className="card card--wide" aria-labelledby="json-title">
      <div className="json-head">
        <h3 id="json-title" className="card__title">
          <Braces size={16} aria-hidden="true" />
          Podgląd JSON
        </h3>
        <span className="toast" aria-live="polite">
          {status}
        </span>
        <div className="json-toolbar">
          <button type="button" className="btn" onClick={copy} aria-label="Kopiuj JSON do schowka">
            {status === 'Skopiowano do schowka!' ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            Kopiuj JSON
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={download}
            aria-label="Pobierz wynik jako plik JSON"
          >
            <Download size={16} aria-hidden="true" />
            Pobierz .json
          </button>
        </div>
      </div>
      <pre className="json-pre" tabIndex={0} aria-label="Wynik analizy w formacie JSON">
        <code>{highlighted}</code>
      </pre>
    </section>
  );
}
