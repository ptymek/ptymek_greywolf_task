import {
  Building2,
  CalendarDays,
  FileSearch,
  Info,
  ListChecks,
  ScanText,
  ShieldCheck,
  Tags,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import type { AnalysisMeta, PdfAnalysisResult } from '../lib/schema';
import { formatAmount, formatDate, formatPageList, languageLabel } from '../lib/format';
import { JsonViewer } from './JsonViewer';

interface AnalysisDashboardProps {
  result: PdfAnalysisResult;
  meta?: AnalysisMeta;
  emptyPages: number[];
  ocrPages: number[];
  onReset: () => void;
}

/**
 * Komponent pokazuje informację o braku danych, np. "Dokument nie zawiera kwot".
 *
 * Wejście (props): children – tekst informacji (string).
 * Wyjście: element <p> (JSX.Element).
 */
function EmptyNote({ children }: { children: string }) {
  return <p className="empty">{children}</p>;
}

/**
 * Komponent pokazuje wynik analizy (F-04, F-05).
 * Komponent pokazuje karty: podsumowanie, metadane, kluczowe punkty,
 * podmioty, kwoty, daty, słowa kluczowe i podgląd JSON.
 * Komponent pokazuje komunikaty: wykryty atak prompt injection, strony z OCR,
 * pominięte strony i przycięty dokument.
 * Daty komponent sortuje od najstarszej.
 *
 * Wejście (props):
 *   - result – wynik analizy (PdfAnalysisResult),
 *   - meta – opcjonalne metadane z proxy (AnalysisMeta),
 *   - emptyPages – numery pominiętych stron (number[]),
 *   - ocrPages – numery stron z OCR (number[]),
 *   - onReset – funkcja dla przycisku "Analizuj kolejny plik".
 * Wyjście: element React (JSX.Element).
 */
export function AnalysisDashboard({
  result,
  meta,
  emptyPages,
  ocrPages,
  onReset,
}: AnalysisDashboardProps) {
  const { document: doc } = result;
  const sortedDates = [...result.dates].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section aria-labelledby="result-title">
      <div className="result-head">
        <div>
          <span className="type-badge">{doc.type}</span>
          <h2 id="result-title">{doc.title}</h2>
        </div>
        <button type="button" className="btn" onClick={onReset}>
          <Upload size={16} aria-hidden="true" />
          Analizuj kolejny plik
        </button>
      </div>

      {meta?.injectionDetected && (
        <div className="notice notice--success" role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            <strong>Wykryto próbę prompt injection w treści dokumentu.</strong> Polecenia zawarte w
            pliku zostały potraktowane jako dane i zignorowane, a wynik sprawdzono pod kątem
            manipulacji.
          </span>
        </div>
      )}
      {ocrPages.length > 0 && (
        <div className="notice" role="status">
          <ScanText size={18} aria-hidden="true" />
          <span>
            Strony bez warstwy tekstowej (skany) odczytano za pomocą OCR: {formatPageList(ocrPages)}
            . Tekst z OCR może zawierać drobne błędy.
          </span>
        </div>
      )}
      {emptyPages.length > 0 && (
        <div className="notice notice--warn" role="status">
          <Info size={18} aria-hidden="true" />
          <span>
            Pominięto strony bez warstwy tekstowej: {formatPageList(emptyPages)}. Ich treść nie
            została uwzględniona w analizie.
          </span>
        </div>
      )}
      {meta?.truncated && (
        <div className="notice notice--warn" role="status">
          <Info size={18} aria-hidden="true" />
          <span>Dokument był bardzo długi – przeanalizowano jego początkową część.</span>
        </div>
      )}

      <div className="grid" style={{ marginTop: 16 }}>
        <article className="card card--summary card--wide">
          <h3 className="card__title">
            <FileSearch size={16} aria-hidden="true" />
            Podsumowanie
          </h3>
          <p className="summary-text" lang={doc.language}>
            {result.summary}
          </p>
        </article>

        <article className="card card--wide">
          <h3 className="card__title">
            <Info size={16} aria-hidden="true" />
            Metadane dokumentu
          </h3>
          <div className="meta-tiles">
            <div className="tile">
              <div className="tile__label">Plik</div>
              <div className="tile__value">{doc.fileName}</div>
            </div>
            <div className="tile">
              <div className="tile__label">Strony</div>
              <div className="tile__value">{doc.pages}</div>
            </div>
            <div className="tile">
              <div className="tile__label">Język</div>
              <div className="tile__value">{languageLabel(doc.language)}</div>
            </div>
            <div className="tile">
              <div className="tile__label">Data dokumentu</div>
              <div className="tile__value">{doc.date ?? '—'}</div>
            </div>
            {meta && (
              <div className="tile">
                <div className="tile__label">Model AI</div>
                <div className="tile__value">{meta.model}</div>
              </div>
            )}
          </div>
        </article>

        <article className="card">
          <h3 className="card__title">
            <ListChecks size={16} aria-hidden="true" />
            Kluczowe punkty
            <span className="card__count">{result.keyPoints.length}</span>
          </h3>
          <ol className="points">
            {result.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>
        </article>

        <article className="card">
          <h3 className="card__title">
            <Users size={16} aria-hidden="true" />
            Podmioty
          </h3>
          <div className="entity-group">
            <p className="tile__label" style={{ marginBottom: 8 }}>
              <Building2 size={12} aria-hidden="true" /> Organizacje
            </p>
            {result.entities.organizations.length ? (
              <ul className="chips">
                {result.entities.organizations.map((o, i) => (
                  <li key={`${i}-${o}`} className="chip chip--org">
                    {o}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>Brak organizacji w dokumencie</EmptyNote>
            )}
          </div>
          <div className="entity-group">
            <p className="tile__label" style={{ marginBottom: 8 }}>
              <Users size={12} aria-hidden="true" /> Osoby
            </p>
            {result.entities.people.length ? (
              <ul className="chips">
                {result.entities.people.map((p, i) => (
                  <li key={`${i}-${p}`} className="chip chip--person">
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>Brak osób w dokumencie</EmptyNote>
            )}
          </div>
        </article>

        <article className="card">
          <h3 className="card__title">
            <Wallet size={16} aria-hidden="true" />
            Kwoty
            <span className="card__count">{result.amounts.length}</span>
          </h3>
          {result.amounts.length ? (
            <ul className="rows">
              {result.amounts.map((a, i) => (
                <li key={i} className="row">
                  <span className="row__value">{formatAmount(a.value, a.currency)}</span>
                  <span className="row__context">{a.context}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Dokument nie zawiera kwot</EmptyNote>
          )}
        </article>

        <article className="card">
          <h3 className="card__title">
            <CalendarDays size={16} aria-hidden="true" />
            Daty
            <span className="card__count">{result.dates.length}</span>
          </h3>
          {sortedDates.length ? (
            <ul className="rows">
              {sortedDates.map((d, i) => (
                <li key={i} className="row">
                  <time
                    className="row__value row__value--date"
                    dateTime={d.date}
                    title={formatDate(d.date)}
                  >
                    {d.date}
                  </time>
                  <span className="row__context">{d.context}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Dokument nie zawiera dat</EmptyNote>
          )}
        </article>

        <article className="card card--wide">
          <h3 className="card__title">
            <Tags size={16} aria-hidden="true" />
            Słowa kluczowe
          </h3>
          {result.keywords.length ? (
            <ul className="chips">
              {result.keywords.map((k, i) => (
                <li key={`${i}-${k}`} className="chip chip--keyword">
                  #{k}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Brak słów kluczowych</EmptyNote>
          )}
        </article>

        <JsonViewer data={result} fileName={doc.fileName} />
      </div>
    </section>
  );
}
